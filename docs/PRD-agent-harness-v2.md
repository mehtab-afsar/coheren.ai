# PRD — Coheren Agent Harness v2

**Status:** Draft  
**Author:** Engineering  
**Date:** 2026-04-01  
**Target Release:** v2.0  

---

## 1. Background & Motivation

Coheren's current 5-agent pipeline was designed for correctness — it reliably produces a personalised curriculum during onboarding and recalibrates every 14 days. However, the architecture has several structural gaps that will cause real user-facing problems as the product scales:

1. **Agent 5 accumulates unbounded history.** The Recalibrator receives the full `performanceHistory[]` on every run. After 6+ months of usage this context grows too large for economy-tier models and degrades output quality.
2. **No pipeline resume.** If any agent fails mid-pipeline (API timeout, rate limit, model error), the user must restart the entire onboarding flow from scratch. There is no checkpoint recovery.
3. **All 5 agents run serially.** Agents 3 and 4 (Curriculum Builder and Task Generator) are partially independent — running them serially wastes 30–60 s of latency that could be hidden with parallel execution.
4. **Agent 5 is only time-triggered.** The Recalibrator fires on a fixed 14-day schedule but has no event-driven triggers — e.g. a user who completes 7 tasks in 2 days and needs difficulty uplift gets no response until the schedule fires.
5. **No isolation for experimental runs.** When testing a new curriculum strategy or stone modification, there is no way to run a shadow pipeline against the user's live data without writing to the real store.
6. **No intra-agent communication.** Agents are pure functions that receive structured input and return structured output. There is no protocol for an agent to request clarification from another agent mid-run.

This PRD defines the changes needed to close these gaps, drawing lessons from the Claude Code production agent harness.

---

## 2. Goals

| # | Goal | Success Metric |
|---|------|---------------|
| G1 | Agent 5 context stays bounded regardless of usage duration | Recalibrator input never exceeds 12 000 tokens |
| G2 | Pipeline failures are recoverable without restarting from scratch | P95 full-pipeline success rate ≥ 99 % (including retries from checkpoint) |
| G3 | Reduce onboarding pipeline wall-clock time | P50 onboarding latency < 25 s (from current ~45 s) |
| G4 | Difficulty adaptation responds to behaviour, not just time | Users who streak 5+ days in a row get difficulty uplift within 24 h |
| G5 | Experimental curricula can be tested in isolation | Shadow runs write to an isolated store, never the live store |
| G6 | Feature flag system covers all new capabilities | Every new mechanism is gated behind a flag; zero hard deploys needed |

---

## 3. Non-Goals

- This PRD does not cover the UI for any of these changes (separate PRD).
- This PRD does not cover multi-user / team features.
- This PRD does not change the stone taxonomy or domain pedagogy logic.
- This PRD does not change AI model selection or the AI router.

---

## 4. Current Architecture Reference

```
src/core/agents/
├── orchestrator.ts          # Coordinates full pipeline (runs agents 1–4 serially)
├── goal-analyzer.ts         # Agent 1 — goal metadata extraction
├── stone-identifier/        # Agent 2 — behavioural profiling (question gen + stone extraction)
│   ├── question-generator.ts
│   ├── stone-extractor.ts
│   └── stone-taxonomy.ts
├── curriculum-builder.ts    # Agent 3 — multi-week roadmap
├── task-generator.ts        # Agent 4 — daily tasks (48 KB, largest agent)
├── recalibrator.ts          # Agent 5 — 14-day adaptive recalibration
└── fallback-task-generator.ts

src/lib/
├── checkpointHelpers.ts     # Checkpoint persistence (partially implemented)
├── agent-logger.ts          # Logs agent runs to Supabase agent_logs

src/config/
├── feature-flags.ts         # Multi-level flag resolution (localStorage > env > defaults)

src/core/store/
└── useStore.ts              # Zustand + persist middleware (localStorage)
```

**Existing feature flags (already in `feature-flags.ts`):**
```
USE_AI_AGENTS, USE_RAG, USE_RECALIBRATION, LOG_AGENT_RUNS,
PUSH_NOTIFICATIONS, DEBUG_PANEL, PREGENERATE_TASKS
```

---

## 5. Changes Required

### 5.1 — Sprint History Compression (Agent 5 Context Bounding)

**Priority:** P0 — affects correctness today for long-term users  
**Files:** `src/core/agents/recalibrator.ts`, new `src/lib/sprintCompressor.ts`

#### Problem

The Recalibrator currently receives the full `performanceHistory[]` array (all weekly check-ins + task completion rates since onboarding). After 6 months this can be 15 000–25 000 tokens, which:
- Exceeds economy-model context windows (llama-3.1-8b: 8 192 tokens)
- Increases cost per Recalibrator call
- Degrades output quality as early sprint data is irrelevant

#### Solution

Implement a two-tier sprint history before passing context to Agent 5:

**Tier 1 — Full fidelity (last 2 sprints):** Keep the last 14 days of raw check-in data verbatim.  
**Tier 2 — Compressed summary (everything older):** Summarise all earlier sprints into a compact behavioural snapshot using a lightweight compression call.

```
Sprint History Input
       │
       ▼
sprintCompressor.compress(history)
       │
       ├─ last 2 sprints → kept verbatim (Tier 1)
       │
       └─ older sprints → compressed into BehaviouralSnapshot
              │
              ▼
       BehaviouralSnapshot {
         totalSprints: number,
         avgCompletionRate: number,
         stoneTrend: Record<StoneId, "improving" | "stable" | "worsening">,
         peakPerformancePhase: string,
         knownDropoffTriggers: string[],
         lastMajorRecalibration: ISO8601,
         summaryNarrative: string     // ≤ 300 words, LLM-generated
       }
```

The Recalibrator receives `{ recentSprints: Sprint[], behaviouralSnapshot: BehaviouralSnapshot }` instead of the raw array.

**Compression trigger:** Compress when `performanceHistory.length > 4` (i.e. after 4 check-ins / ~8 weeks). Below that threshold, pass raw data.

**Implementation steps:**
1. Create `src/lib/sprintCompressor.ts` with `compress(history: Sprint[]): CompressedContext`
2. Add a lightweight AI call inside `compress()` to generate `summaryNarrative` (temperature 0.1, economy model)
3. Persist the `BehaviouralSnapshot` in Supabase alongside the user profile so it is not recomputed on every run
4. Modify `recalibrator.ts` to call `sprintCompressor.compress()` before building its prompt
5. Add feature flag: `COMPRESS_SPRINT_HISTORY` (default: `true`)

**Token budget target:** Recalibrator input ≤ 12 000 tokens at any usage age.

---

### 5.2 — Pipeline Checkpoint & Resume

**Priority:** P0 — user-facing failure recovery  
**Files:** `src/lib/checkpointHelpers.ts` (extend), `src/core/agents/orchestrator.ts` (modify)

#### Problem

`checkpointHelpers.ts` exists but only saves the final pipeline output. If Agent 3 fails after Agent 1 and 2 have already completed, the orchestrator retries from Agent 1 — wasting 2 successful API calls and adding 15–20 s of latency.

#### Solution

Extend the checkpoint system to save the output of **each agent** as it completes. On retry, the orchestrator resumes from the last successful checkpoint.

```
Pipeline Execution (happy path):
  Agent 1 completes → saveCheckpoint('goal_analysis', result)
  Agent 2 completes → saveCheckpoint('stone_profile', result)
  Agent 3 completes → saveCheckpoint('curriculum', result)
  Agent 4 completes → saveCheckpoint('tasks', result)
  clearCheckpoints()

Pipeline Execution (Agent 3 failure → retry):
  loadCheckpoint('stone_profile') → found
  Skip Agent 1 & 2, resume at Agent 3
  Agent 3 completes → saveCheckpoint('curriculum', result)
  Agent 4 completes → saveCheckpoint('tasks', result)
  clearCheckpoints()
```

**Checkpoint schema:**
```typescript
interface AgentCheckpoint {
  pipelineId: string;          // uuid per onboarding attempt
  agentKey: 'goal_analysis' | 'stone_profile' | 'curriculum' | 'tasks';
  completedAt: ISO8601;
  ttlMinutes: number;          // default: 60 — stale checkpoints auto-expire
  output: unknown;             // agent-specific output type
}
```

**Storage:** Checkpoints are stored in Supabase (not localStorage) so they survive browser refresh and can be debugged server-side.

**Implementation steps:**
1. Extend `checkpointHelpers.ts`:
   - `saveAgentCheckpoint(pipelineId, agentKey, output)`
   - `loadAgentCheckpoint(pipelineId, agentKey): T | null`
   - `clearPipelineCheckpoints(pipelineId)`
   - `expireStaleCheckpoints()` (called on app boot)
2. Update `orchestrator.ts` to:
   - Generate a `pipelineId` at the start of each run
   - Save checkpoint after each agent completes
   - On error, check for existing checkpoint before re-running prior agents
   - Clear checkpoints on successful pipeline completion
3. Add Supabase table: `pipeline_checkpoints(id, user_id, pipeline_id, agent_key, output jsonb, completed_at, expires_at)`
4. Add feature flag: `PIPELINE_CHECKPOINTS` (default: `true`)

---

### 5.3 — Parallel Agent Execution (Latency Reduction)

**Priority:** P1 — user experience  
**Files:** `src/core/agents/orchestrator.ts`

#### Problem

The current orchestrator runs all 5 agents sequentially. However, once Agent 2 (Stone Identifier) completes, Agent 3 (Curriculum Builder) and some pre-work for Agent 4 (Task Generator) are independent of each other — they could run concurrently.

#### Solution

Introduce a **two-wave execution model** in the orchestrator:

```
Wave 1 (serial — data dependency):
  Agent 1 (Goal Analyzer)
       ↓
  Agent 2 (Stone Identifier)

Wave 2 (parallel — both receive Agent 1+2 output):
  Agent 3 (Curriculum Builder) ──┐
                                  ├── Promise.allSettled()
  Agent 4 pre-scaffold           ──┘
       ↓
  Agent 4 final pass (uses Agent 3 curriculum output)

Wave 3 (serial):
  Agent 5 is not part of onboarding — runs on schedule
```

**Note on Agent 4:** Task Generator requires the full curriculum from Agent 3, but its first pass (scaffolding the task structure, selecting resources from the RAG library) can begin speculatively using Agent 2 output alone, then be merged with Agent 3's output in a final pass. This is an optimisation — if the speculative output diverges too much, fall back to serial.

**Simpler option (implement first):** Run Agent 3 and a resource pre-fetch in parallel. Agent 4 starts immediately after Agent 3 completes but with resources already loaded.

**Implementation steps:**
1. Refactor `orchestrator.ts` to support wave-based execution
2. Implement parallel `Promise.allSettled()` for Wave 2
3. If either parallel task fails, fall back to the serial path (checkpoints ensure no wasted work)
4. Add feature flag: `PARALLEL_AGENT_EXECUTION` (default: `false` initially, enable after 1-week soak)
5. Add timing metrics to `agent-logger.ts`: log wave start/end times per agent

**Expected latency improvement:** 12–18 s reduction in P50 onboarding time.

---

### 5.4 — Event-Driven Recalibration Triggers

**Priority:** P1 — user experience / retention  
**Files:** `src/core/agents/recalibrator.ts`, new `src/lib/recalibrationTrigger.ts`, `src/hooks/useDifficultyMonitor.ts` (extend)

#### Problem

Agent 5 fires on a fixed 14-day schedule. A user who streaks 7 days in a row is clearly underloaded — they need a difficulty uplift now, not in 10 days. Conversely, a user who misses 4 consecutive days is at high churn risk and needs a difficulty reduction today.

#### Solution

Implement **event-driven micro-recalibration** alongside the existing 14-day full recalibration.

**Trigger conditions:**

| Event | Condition | Action |
|-------|-----------|--------|
| Streak uplift | 5+ consecutive completions at ≥ 85 % rate | +1 difficulty level on next-day tasks |
| Dropout risk | 3+ consecutive missed days | −1 difficulty level + motivational reframe |
| Pace mismatch | User completes daily tasks in < 50 % of estimated time for 3 days | Increase task density |
| Overload signal | User skips ≥ 40 % of tasks for 5 days | Reduce task count, redistribute content |

**Micro-recalibration vs full recalibration:**
- **Micro (new):** Adjusts tomorrow's task difficulty/count only. Runs client-side with a lightweight prompt. No full curriculum rebuild.
- **Full (existing, Agent 5):** Rebuilds the curriculum phase. Runs on 14-day schedule + manually triggered by user.

**Implementation steps:**
1. Create `src/lib/recalibrationTrigger.ts`:
   - `evaluateTriggers(performanceHistory, streak, completionRate): TriggerResult`
   - `applyMicroRecalibration(triggerResult, tomorrowsTasks): Task[]`
2. Extend `useDifficultyMonitor.ts` to call `evaluateTriggers()` after each task completion
3. Run micro-recalibration client-side (no API call needed for simple difficulty +/− adjustments)
4. For more complex triggers (e.g. motivational reframe copy), make a lightweight AI call
5. Add feature flag: `EVENT_DRIVEN_RECALIBRATION` (default: `false`, enable after testing)
6. Log trigger events to `agent_logs` with `agent_key: 'micro_recalibration'`

---

### 5.5 — Shadow / Isolated Pipeline Runs

**Priority:** P2 — developer experience / A/B testing  
**Files:** new `src/core/agents/shadowOrchestrator.ts`, `src/core/store/useStore.ts` (extend)

#### Problem

When testing a new stone modification, a new pedagogy framework, or an updated Agent 3 prompt, there is no way to run the pipeline against real user data without overwriting the user's live curriculum. Developers currently have to create test accounts or use production data with extreme care.

#### Solution

Implement a **shadow mode** for the orchestrator. A shadow run:
- Receives the same input as a live run (goal, stone profile, user history)
- Produces output to an isolated shadow store (not the live Zustand store)
- Never writes to the user's Supabase tables
- Produces a diff report comparing shadow output vs live output

```typescript
// Usage
const shadowResult = await shadowOrchestrator.run({
  input: liveUserInput,
  overrides: { curriculumBuilderPrompt: experimentalPrompt },
  userId: 'shadow_test_user'   // writes to shadow_ prefixed tables only
});

shadowOrchestrator.diff(liveResult, shadowResult); // returns DiffReport
```

**Implementation steps:**
1. Create `src/core/agents/shadowOrchestrator.ts` that wraps `orchestrator.ts`
2. Shadow writes go to a `shadow_store` object (in-memory Map, never persisted)
3. Shadow Supabase writes use `shadow_` prefixed table names (create shadow tables in migration)
4. Add `DiffReport` type and `diff()` utility comparing two `AgentRoadmapV2` objects
5. Add debug panel integration: when `DEBUG_PANEL` flag is true, expose a "Run Shadow Pipeline" button
6. Add feature flag: `SHADOW_PIPELINE` (default: `false`, dev/staging only)

---

### 5.6 — Feature Flag Expansion

**Priority:** P1 — required for safe rollout of all above changes  
**Files:** `src/config/feature-flags.ts`

Add the following flags to the existing system (which already supports localStorage > env > defaults precedence):

```typescript
// New flags to add to feature-flags.ts

COMPRESS_SPRINT_HISTORY: boolean        // default: true   — 5.1
PIPELINE_CHECKPOINTS: boolean           // default: true   — 5.2
PARALLEL_AGENT_EXECUTION: boolean       // default: false  — 5.3
EVENT_DRIVEN_RECALIBRATION: boolean     // default: false  — 5.4
SHADOW_PIPELINE: boolean                // default: false  — 5.5
BACKGROUND_TASK_PREGENERATION: boolean  // default: false  — see 5.7 (existing PREGENERATE_TASKS flag — rename for clarity)
AGENT_TIMING_METRICS: boolean           // default: true   — latency logging
MICRO_RECALIBRATION_AI_CALLS: boolean   // default: false  — controls whether micro-recal uses AI or rules-only
```

All new flags must have:
- A default value
- A comment explaining the rollout risk if enabled
- An entry in the debug panel when `DEBUG_PANEL=true`

---

### 5.7 — Background Task Pre-Generation

**Priority:** P2 — performance  
**Files:** `src/core/agents/task-generator.ts`, `src/hooks/useAutoAdvance.ts`

#### Problem

The `PREGENERATE_TASKS` flag exists but the implementation is incomplete. When a user finishes Day N tasks, Day N+1 tasks are generated on-demand when the user next opens the app — causing a visible loading spinner.

#### Solution

After the user completes Day N (detected by `useAutoAdvance.ts`), trigger background pre-generation of Day N+1 tasks. The user sees no spinner when they return.

**Implementation steps:**
1. In `useAutoAdvance.ts`, after marking Day N complete, check `BACKGROUND_TASK_PREGENERATION` flag
2. If enabled, call `taskGenerator.pregenerate(day: N+1)` in a non-blocking `Promise` (fire-and-forget)
3. Store pre-generated tasks in Supabase with `status: 'pregenerated'`
4. On Day N+1 load, check for `status: 'pregenerated'` tasks before triggering live generation
5. If pre-generated tasks are stale (> 48 h), regenerate on-demand and discard the stale version
6. Enable flag after 1-week soak: `BACKGROUND_TASK_PREGENERATION=true`

---

### 5.8 — Enhanced Agent Logging & Observability

**Priority:** P1 — required for all of the above to be debuggable  
**Files:** `src/lib/agent-logger.ts`

The existing `agent-logger.ts` logs agent runs to Supabase `agent_logs`. Extend it to capture:

```typescript
interface AgentLog {
  // existing
  agent_key: string;
  user_id: string;
  created_at: ISO8601;
  success: boolean;
  error_message?: string;

  // new fields
  pipeline_id: string;         // links all agents in one pipeline run
  wave: number;                // 1 or 2 (for parallel execution)
  duration_ms: number;         // wall-clock time for this agent
  input_tokens: number;        // from model response usage
  output_tokens: number;
  model_used: string;
  checkpoint_restored: boolean; // was this agent skipped due to checkpoint?
  trigger_type: 'scheduled' | 'event_driven' | 'manual' | 'shadow';
  context_size_tokens: number; // for Agent 5: track compression effectiveness
}
```

Add a Supabase migration to add these columns to `agent_logs`.

---

## 6. Database Migrations Required

| Migration | Table | Change |
|-----------|-------|--------|
| M1 | `pipeline_checkpoints` | New table (see 5.2) |
| M2 | `agent_logs` | Add columns: `pipeline_id`, `wave`, `duration_ms`, `input_tokens`, `output_tokens`, `model_used`, `checkpoint_restored`, `trigger_type`, `context_size_tokens` |
| M3 | `user_profiles` | Add column: `behavioural_snapshot jsonb` (stores compressed sprint history) |
| M4 | `shadow_pipeline_checkpoints` | Shadow version of `pipeline_checkpoints` |
| M5 | `shadow_agent_roadmap` | Shadow version of roadmap output table |

---

## 7. Implementation Order

Build in this order — each phase is independently shippable behind its flag:

### Phase 1 — Stability (Weeks 1–2)
1. **5.2 Pipeline Checkpoint & Resume** — highest user impact, reduces retry pain
2. **5.6 Feature Flag Expansion** — enables safe rollout of everything else
3. **5.8 Enhanced Agent Logging** — must be in place before measuring Phase 2

### Phase 2 — Performance (Weeks 3–4)
4. **5.1 Sprint History Compression** — prevents degradation for long-term users
5. **5.3 Parallel Agent Execution** — latency reduction (enable flag after 1-week soak)
6. **5.7 Background Task Pre-Generation** — completes existing partial implementation

### Phase 3 — Intelligence (Weeks 5–6)
7. **5.4 Event-Driven Recalibration** — retention impact
8. **5.5 Shadow Pipeline** — dev tooling for A/B testing

---

## 8. Testing Requirements

Each change must be covered by:

### Unit Tests (Vitest)
- `sprintCompressor.compress()` — test with 4, 8, 20 sprint histories; verify token count ≤ 12 000
- `checkpointHelpers` — save/load/expire; test resume skips correct agents
- `recalibrationTrigger.evaluateTriggers()` — all 4 trigger conditions
- `shadowOrchestrator.diff()` — compares identical and divergent roadmaps

### Integration Tests (existing `test-full-pipeline.ts`)
- Extend to test checkpoint recovery: inject failure at Agent 3, verify resume
- Extend to test parallel execution: verify output matches serial execution
- Extend to test shadow mode: verify no writes to live tables

### Simulation Tests (existing `test-10day-simulation.ts`)
- Extend to 90-day simulation to verify sprint compression activates and doesn't degrade output
- Verify micro-recalibration triggers fire at correct thresholds

### E2E Tests (Playwright)
- Onboarding with simulated Agent 3 failure → verify user sees resume UI, not full restart
- Day completion → verify background pre-generation fires (check network tab for background call)

---

## 9. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Sprint compression loses important early-stage data | Medium | Keep full data for first 6 sprints; compress only beyond that |
| Parallel execution produces non-deterministic output | Low | Both waves receive identical seed context; output is deterministic per model run |
| Checkpoint expiry too aggressive → user loses progress | Low | Default TTL 60 min; extend to 24 h if user abandons mid-onboarding and returns |
| Event-driven micro-recalibration fires too often | Medium | Rate-limit to once per 24 h per trigger type |
| Shadow pipeline accidentally writes to live tables | Low | Prefix guard in `shadowOrchestrator.ts` + Supabase row-level security on live tables |

---

## 10. Out of Scope (Future PRDs)

- **Intra-agent communication protocol** (analogous to Claude Code's `SendMessageTool`) — would allow Agent 3 to ask Agent 2 a clarifying question mid-run. Deferred to v2.1.
- **Autonomous agent coordinator** (analogous to Claude Code's `COORDINATOR_MODE`) — would allow Agent 5 to spin up a sub-agent to handle a specific user segment. Deferred to v3.0.
- **Voice input for onboarding questions** (analogous to Claude Code's `VOICE_MODE` flag — confirmed built but gated). Deferred to v2.2.
- **Worktree isolation for parallel user experiments** — Deferred to v2.1.
