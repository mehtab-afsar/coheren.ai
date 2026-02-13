# Coheren AI — Next Steps

**Last updated:** 2026-02-13
**Current state:** Agents 1–5 complete · 93.5% test pass rate · Build clean · ESLint clean

---

## Where We Are

```
✅ Agent 1 — Goal Analyzer          (70b, temp 0.2)
✅ Agent 2 — Stone Identifier        (70b, temp 0.2)
✅ Agent 3 — Curriculum Builder      (70b, temp 0.3)
✅ Agent 4 — Task Generator          (8b, temp 0.5) + URL sanitizer + min-step guard
✅ Agent 5 — Recalibrator            (70b, temp 0.3) + STONE_RECALIBRATION_MATRIX
✅ Orchestrator                      wires all 5 agents
✅ RAG pipeline                      Jina embeddings + pgvector (DB empty — see P0 below)
✅ Static resource library           resourceMatcher.ts
✅ E2E test: Alex runner             60/60 checks
✅ Multi-persona test: 5 archetypes  109/125 checks
✅ TEST_REPORT.md                    full bug + recommendation list
```

---

## P0 — Fix Before Any Real Users

These block correct functioning in production. Do these first.

### 1. Populate the RAG database

**Why:** All 10 RAG checks fail — `knowledge_chunks` table is empty. Agent 4 and Agent 5 have no science context. They fall back to LLM prior knowledge only.

**How:**
```bash
# Make sure VITE_JINA_API_KEY is set in .env
npx supabase start
npx tsx scripts/ingest-knowledge.ts
npx tsx scripts/verify-rag.ts   # confirm chunks stored
npx tsx scripts/test-personas.ts # re-run — all RAG checks should pass
```

**Minimum content to ingest before launch (one source per domain):**
- Health/Running — James Clear Atomic Habits summary, running training science
- Career — imposter syndrome research, job search strategy
- Creative — writer's block, creative habit formation
- Financial — compound interest, diversification basics
- Cognitive — spaced repetition, active recall, cognitive load theory

---

### 2. Add UI error boundary around agent calls

**Why:** If any of Agents 1–3 fails during onboarding (network, rate limit, bad JSON), the user sees a broken React tree with no recovery path.

**File:** [src/features/onboarding/components/ChatOnboarding.tsx](src/features/onboarding/components/ChatOnboarding.tsx)

**What to add:**
- Wrap the agent call chain in try/catch with a user-visible error state
- Show "Something went wrong — try again" with a retry button
- Log the error to console so it's visible in dev

---

## P1 — Quality: Delivery Rule Gaps

These cause stone-aware coaching to be inconsistent for 3 out of 5 tested personas.

### 3. Financial domain — explicit delivery rules

**Why:** Marcus (investor) test: Day 1 task implied "Real Money Check" but didn't use the trigger phrase. The 8b model paraphrased the rule instead of applying the exact label.

**File:** [src/core/agents/task-generator.ts:101](src/core/agents/task-generator.ts#L101) (`DOMAIN_DELIVERY_CONTEXT`)

**What to add** inside `DOMAIN_DELIVERY_CONTEXT.Financial`:
```
- Every step must be explicitly labelled: "(Simulation)" or "(Real Action — only if you are ready)".
  Never mix simulation and real action in the same step.
- Add "Real Money Check" tip: "Before taking any real action with money, complete the
  simulation version first."
```

---

### 4. Career + FearOfFailure tiebreaker

**Why:** Sarah (job seeker) test: FearOfFailure's `Experiment:` framing replaced the Career domain rule requiring a tangible artifact in `successCriteria`. The success criteria was open-ended ("just try") instead of "LinkedIn About section written."

**File:** [src/core/agents/task-generator.ts:181](src/core/agents/task-generator.ts#L181) (`buildSystemPrompt`)

**What to add** after the stone rules block:
```
── DOMAIN + STONE TIEBREAKER ──
If domain is Career AND FearOfFailure is active:
- Keep Experiment framing in the title.
- successCriteria.primary MUST name a specific deliverable
  (e.g., "Draft written — quality is irrelevant, existence is the goal").
- Do NOT use open-ended criteria like "just try it" or "see what happens".
```

---

### 5. Agent 4 retry on <2 steps with 70b fallback

**Why:** The min-step guard in `validateAndNormalize()` auto-inserts a generic setup step, but the injected step is not stone-aware. A better fix is to retry the whole generation with the 70b model when the 8b returns only 1 step.

**File:** [src/core/agents/task-generator.ts:415](src/core/agents/task-generator.ts#L415) (inside `generateTask`)

**What to add** after `validateAndNormalize`:
```typescript
// If 8b collapsed to 1 real step, retry with 70b (quality fallback)
if (result.task.steps.length <= 1) {
  const retryCompletion = await callGroqWithFallback({ ...same params }, 'standard');
  const retryRaw = JSON.parse(retryCompletion.choices[0].message.content ?? '{}');
  const retryResult = validateAndNormalize(retryRaw, dayNumber, ...);
  if (retryResult.task.steps.length >= 2) return retryResult;
}
```

---

## P2 — Test Coverage Gaps

These aren't breaking anything today but will cause silent regressions as the codebase grows.

### 6. E2E tests for Agent 5 SIMPLIFY and RECOVER paths

**Why:** The current E2E runner (`scripts/test-e2e-runner.ts`) only covers the MAINTAIN path (80% completion, 3.0 avg difficulty). SIMPLIFY and RECOVER have different coaching outputs, RAG injection, and modified-task generation — none of it is integration-tested end-to-end.

**What to build:** Two new simulations in the same script or a new `scripts/test-e2e-simplify.ts`:

```
SIMPLIFY scenario:
  Days 1–14: 50% completion (7/14 done), avg difficulty 4.8, 3 difficulty skips
  Expected: STATUS=SIMPLIFY, paceAdjustment=slow-down, difficultyReduction=true

RECOVER scenario:
  Days 1–14: 3 health skips (knee pain), 1 consecutive-4-skip streak
  Expected: STATUS=RECOVER, paceAdjustment=slow-down, coaching references injury
```

---

### 7. Update Raj persona expected stone list

**Why:** Test currently expects `CognitiveFatigue|SkillGap` but the model correctly picks `TimeConstraint` as primary for an 8-week cert with 1h/day. The test is wrong, not the model.

**File:** [scripts/test-personas.ts:176](scripts/test-personas.ts#L176)

```typescript
// Change:
expectedPrimaryStone: ['CognitiveFatigue', 'SkillGap'],
// To:
expectedPrimaryStone: ['CognitiveFatigue', 'SkillGap', 'TimeConstraint'],
```

After this fix, the multi-persona test should reach **110/125** without any real bugs hidden.

---

### 8. Wire Vitest for unit tests

**Why:** All current tests are `tsx` scripts run manually. No `npm test` command. No CI integration.

```bash
npm install -D vitest @vitest/ui
```

Move the pure-logic parts (computeSignals, resolvePhaseForDay, sanitizeResourceUrl, validateAndNormalize) into unit test files:
```
src/core/agents/__tests__/recalibrator.test.ts
src/core/agents/__tests__/task-generator.test.ts
```

Add to `package.json`:
```json
"test": "vitest",
"test:ui": "vitest --ui"
```

---

## P3 — Dashboard UI Polish

These are needed for a real user-facing product but don't affect agent quality.

### 9. Cinema Mode URL display

**Why:** Resource URLs are now YouTube search queries (e.g. `youtube.com/results?search_query=experiment+run+walk+intervals`). The `ResourceCard.tsx` should display this as a proper "Search YouTube for: run-walk intervals" link rather than showing a raw URL.

**File:** `src/features/dashboard/components/ResourceCard.tsx`

**What to change:**
- Detect `results?search_query=` URLs
- Display as: `🔎 Search: "run-walk intervals"` with the YouTube logo
- On click, open in new tab

---

### 10. CheckpointScreen — show Agent 5 stone directive

**Why:** Agent 5 generates a personalized coaching brief. The UI only shows `personalizedMessage`. The `stoneDirective` (e.g. "Keep Never Miss Twice rule prominent") is the most actionable piece but isn't surfaced to the user.

**File:** `src/features/dashboard/components/CheckpointScreen.tsx`

**What to add:** A "Your next sprint focus" section that renders the stone-specific directive for the user's primaryStone + current STATUS. E.g.:

> **Your Consistency Plan for Sprint 2**
> Keep the Never Miss Twice rule front and centre. Celebrate every streak, no matter how short.

---

### 11. Progress dashboard shows stone context

**Why:** `ProgressView.tsx` shows completion % and streak but no connection to the behavioral profile. A user doesn't know why they're getting the tasks they're getting.

**What to add:** A small "Your profile" card showing:
- Primary stone (e.g. "Inconsistency")
- What that means in plain English (e.g. "Your tasks are designed to be easy to start")
- Current phase name + science rationale

---

## P4 — Production Infrastructure

Do these before going beyond a closed beta.

### 12. Environment separation

Right now there's one `.env` file for both dev and prod Supabase. Create:
```
.env.local      → local Supabase (127.0.0.1:54321)
.env.production → hosted Supabase project
```

### 13. Groq rate limit monitoring

The `callGroqWithFallback()` function silently falls back from 70b to 8b on rate limits. Add a counter (Zustand or Supabase log) so you can see how often this happens in production. If 8b fallback rate >10%, upgrade Groq tier or cache common prompts.

### 14. Supabase RLS audit

Verify all tables have Row Level Security policies enabled for production:
```sql
-- Run this and check every table returns 'enabled'
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

---

## Quick Reference: Run All Tests

```bash
# Full agent unit tests (per-agent)
npx tsx scripts/test-agents.ts      # Agents 1 & 2
npx tsx scripts/test-agent3.ts      # Agent 3
npx tsx scripts/test-agent4.ts      # Agent 4
npx tsx scripts/test-agent5.ts      # Agent 5 (63 checks)

# Integration tests
npx tsx scripts/test-e2e-runner.ts  # 10-day E2E, Alex runner (60 checks)
npx tsx scripts/test-personas.ts    # 5 personas full pipeline (125 checks)

# RAG
npx tsx scripts/verify-rag.ts       # Check RAG DB has chunks
npx tsx scripts/ingest-knowledge.ts # Populate RAG DB (run once)

# DB
npx supabase db reset               # Reset + apply seed.sql
npm run db:verify                   # Verify DB tables

# Build + lint
npm run build && npx eslint src scripts
```

---

## Suggested Sprint Order

```
Sprint 1 (now)   → #1 RAG population + #2 error boundary + #3 financial domain rules
Sprint 2         → #4 career tiebreaker + #5 70b retry + #6 SIMPLIFY/RECOVER E2E tests
Sprint 3         → #7 test fix + #8 Vitest setup + #9 Cinema Mode URL display
Sprint 4         → #10 CheckpointScreen stone directive + #11 Progress stone context
Sprint 5         → #12–#14 production infra
```
