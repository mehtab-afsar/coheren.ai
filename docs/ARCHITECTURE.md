# Coheren — Architecture

Deep technical reference. For the product overview, stack summary, and commands see the [README](../README.md).

---

## Guiding principle: deterministic control, generative surface

The whole system is built to **keep the LLM on a short leash**. Anything that must be correct — enums, counts, phase/timeline math, the recalibration decision, feasibility — is computed in TypeScript. The LLM only fills generative surface (task copy, interview questions, curriculum prose). Every agent output is normalized and clamped; the daily task loop has a deterministic no-LLM fallback so it can never hard-fail.

This shows up everywhere:
- Phase count & timeline are formula-driven (`computePhaseCount`, sqrt-scaled `computeAdjustedTimeline` + stone multipliers), not LLM-decided.
- The A5 recalibration **decision** (RECOVER/SIMPLIFY/MAINTAIN/ACCELERATE) is computed in code; the LLM is told to trust it, then only rewrites prose.
- Feasibility (`core/agents/feasibility.ts`) computes days×minutes vs an hours-to-competence table and can only *tighten* the LLM's realism verdict, never loosen it.
- Scale-backed stone severity (`core/agents/stone-identifier/scales.ts`) is scored deterministically from validated instruments; the LLM label is overridden for those stones.

---

## Layering

```
config  →  used by everything (env, feature-flags)
core    →  domain logic; imports lib + config + types, NEVER features
lib     →  infra (supabase, ai-router, database, analytics, resources)
features→  UI; imports core + lib + shared; NEVER other features
```

Path aliases: `@core / @features / @lib / @config / @hooks / @types-app / @shared`. Rules held in code: zero `core → features` imports, zero cross-feature imports, one data-access layer (`lib/database.ts` — feature/component code does not call `supabase.from(` directly).

---

## The agent pipeline (`src/core/agents/`)

Sequential, orchestrated during onboarding and on the weekly checkpoint. Tiers map to Groq models via `lib/ai-router.ts` (retry / timeout / 429-backoff centralized).

### A1 — Goal Analyzer (`goal-analyzer.ts`, reasoning/70B)
Free-text goal → structured `Agent1Output.goalAnalysis`: domain, category, horizon, intensity, SMART status, realism, constraints, risks, `typicalTimeline`, milestones.
- **Feasibility anchor** (`feasibility.ts`): after the LLM call, `assessFeasibility({goalText, timelineDays, dailyMinutes})` computes `availableHours` vs a coarse `requiredHours` table → verdict `comfortable | tight | unrealistic` + a rescope suggestion. It **overrides `realismChecks.timeRealism`** deterministically (can only tighten). Surfaced in the onboarding reality-check gate with real numbers.

### A2 — Stone Identifier (`stone-identifier/`, reasoning/70B)
A short **Motivational-Interviewing adaptive interview** (`interview-engine.ts`, funnel: open → reflective → diagnostic; MAX 7 questions, stops early at confidence ≥ 0.8) → a `StoneProfile`.
- Output is **bounded** — filtered to `ALL_STONE_TYPES`, capped at 4, deterministic `crossValidateStones`, `never_tried` blocks a false Inconsistency label.
- **Measured severity** (`scales.ts`): validated micro-scales (GSE-3 → LowConfidence, PPS-3 → ProcrastinationPattern, PFAI-4 → FearOfFailure) with deterministic scoring. The self-efficacy ruler collected in onboarding (1–10) sets LowConfidence severity via `lowConfidenceSeverityFromRuler`; that stone is flagged `measured: true`. Un-scaled stones stay LLM-inferred.
- `stone-taxonomy.ts` holds the 13-stone ontology + `STONE_PERSONALITIES` (archetype, core belief, validated scale, `evidence_based_interventions`) — the interventions are injected into the A4 delivery prompt for High/Critical stones.

### A3 — Curriculum Builder (`curriculum-builder.ts`, reasoning/70B)
Goal + stones + RAG → a phased month→week→day roadmap. Phase math is formula-driven. Retrieves domain knowledge before building. Rolling curriculum — only week 1 is fully populated; later weeks fill in as the user progresses. `STONE_DOMAIN_TIEBREAKERS` inject domain-specific ordering (e.g. Career:FearOfFailure → private drafts before public work).

### A4 — Task Generator (`task-generator.ts`, economy/8B)
Roadmap day → one concrete `DailyTask`: title, `estimatedMinutes`, 30-30-40 `segments`, `steps`, `whyThisMatters`, `successCriteria`, `coachTips`, a curated resource.
- **Quality gate** (`validateTaskQuality`): rejects vague steps, empty `whyThisMatters`, missing segments; `whyThisMatters` + `segments` are in the tool-call `required` set. On failure it retries on 70B and adopts the retry only if it reduces validation issues; otherwise falls to `generateFallbackTask` (deterministic, no LLM).
- `sanitizeResourceUrl` catches the 8B model hallucinating the Rickroll id.
- Resources come from `lib/resourceRetriever.ts` (semantic match over a `resources` table when `USE_DYNAMIC_RESOURCES`, else the static `resourceLibrary.ts`); off-library goals get an honest YouTube **search** link, never an off-topic video.

### A5 — Recalibrator (`recalibrator.ts`, reasoning/70B)
Every 7 days: computes completion rate, skips, difficulty overage **in TypeScript** → a decision (RECOVER/SIMPLIFY/MAINTAIN/ACCELERATE), tells the LLM to trust it, rewrites the upcoming week. Triggered from the checkpoint flow; an early-recalibration path (`useDifficultyMonitor`) can fire on consecutive hard skips.

**Boundary validation:** `core/agents/schemas.ts` provides `safeValidate` (non-throwing zod) at the A4 boundary as drift observability; the hard gate is `validateTaskQuality`.

---

## RAG (`src/core/rag/`)

1. **Embed** the query with Jina v3 (`lib/jina-client.ts`, via ai-proxy).
2. **Retrieve** top-k from `knowledge_chunks` via the `match_knowledge_chunks` pgvector RPC (ivfflat cosine).
3. **Fuse** with a client-side BM25 pass using **Reciprocal Rank Fusion** (k=60).
4. **Rerank** with a Jina cross-encoder.
5. Flows into A3/A4/A5 prompts.

**Corpus** = `src/knowledge/frameworks/*.md` + `src/knowledge/domains/**/*.md` (ingested by `scripts/ingest-knowledge.ts` → `npm run rag:ingest`) plus static chunks in `core/rag/knowledge-base.ts`. Seeded into `supabase/seed.sql` (~5.6 MB) so `db reset` restores it. `npm run rag:verify` checks row count + a sample query.

Flags gate optional RAG behavior: `USE_CONTEXTUAL_RETRIEVAL`, `USE_RAG_METADATA_FILTERS`, `USE_DYNAMIC_RESOURCES` (on); RAPTOR index + standalone reranker paths exist behind flags but are not core.

---

## State (`src/core/store/`)

Single Zustand store, persisted to `localStorage` under `consist-storage`. Holds app state + the domain `Task` type + orchestration triggers. There is **no router** — the `step` field drives which surface renders (`0` landing, `1` onboarding, `2` dashboard, `3/4` auth, `10` settings). `App.tsx` hosts the Supabase auth listener: on a session it `identifyUser`s, fires `signup` for genuinely new accounts, and reconciles the persisted store against the DB on boot.

> Known debt: the store mixes state + DB writes + orchestration (a large "god-store"), and the domain `Task` type lives here rather than in `@types-app`. Deferred behind the validation phase.

---

## Data model (Postgres, `supabase/migrations/`)

21 migrations, replay cleanly from empty (`IF NOT EXISTS` / `DROP POLICY IF EXISTS`), **full RLS with `auth.uid()` policies on every table**.

| Table | Purpose |
|---|---|
| `profiles` | User profile |
| `user_goals` | One row per goal (owns the roadmap); `created_at` = signup/goal anchor |
| `roadmaps` | Phased plan for a goal |
| `daily_tasks` | Generated tasks; `is_completed`, `completed_at`, `difficulty_rating`, `actual_duration`, `skipped` |
| `goal_stones` | Persisted stone profile |
| `task_feedback` | Per-task difficulty/duration feedback (append-only + RLS) |
| `checkpoints` | Weekly checkpoint records |
| `knowledge_chunks` | RAG corpus embeddings (pgvector) |
| `sprint_memories` | Task-pattern memory for A4 similarity |
| `push_subscriptions` | Web-push endpoints (endpoint/keys only — no preferred-time field) |
| `ai_rate_limit` | Per-user AI rate limiting (`check_and_increment_rate_limit` RPC) |

---

## Edge functions (`supabase/functions/`, Deno)

- **`ai-proxy`** (mandatory) — key-hiding gateway. `verify_jwt = false`, per-user rate limit via RPC. Forwards `<provider>/<rest>` to the upstream: e.g. `groq/openai/v1/chat/completions` → `https://api.groq.com/openai/v1/chat/completions`. **The client baseURL must include `/openai/v1`** (`lib/groq-client.ts`) or requests 404.
- **`send-reminders`** — web-push sender (VAPID). *Not deployed for the validation test* — it is push-only, has no time-of-day filter, and there is no stored preferred-time field, so reminders during the test are sent concierge-style (manual email).

---

## Configuration

- **`config/env.ts`** — typed env access; **throws at startup** on missing required vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Everything else optional with graceful degradation.
- **`config/feature-flags.ts`** — a single `Object.freeze`d registry; precedence localStorage > env > default, with `?ff_*` URL overrides (per-device). Prod-safe defaults: `DEBUG_PANEL: false`, `SHADOW_PIPELINE: false`, Claude off, Jina reranking off, all-Groq.

---

## Analytics (`src/lib/analytics.ts`)

Thin PostHog wrapper; **no-ops without `VITE_POSTHOG_KEY`**, `autocapture` + `capture_pageview` off (explicit events only). Users are `identify()`d with `auth.users.id`.

**Activation funnel** (the validation plumbing): `landing_view`, `onboarding_started`, `onboarding_completed`, `signup` (fired only for new accounts, gated on account age < 5 min), then task-level events (`task_completed`, `day_completed`, `streak_milestone`, checkpoints).

The **retention number** does not depend on new events — `scripts/retention.sql` computes active-return D1/D2/D4/D7 + the activation gate directly from `auth.users.created_at` + `daily_tasks.completed_at`. See the README's Validation section.

---

## Testing

- **Unit (Vitest):** heaviest on the risky pieces — `feasibility`, `scales`, `repair-json`, `task-generator`, `recalibrator`, difficulty monitor.
- **E2E (Playwright):** smoke/auth/dashboard, seeded via `addInitScript` + a `sb-127-auth-token` JWT and a mocked Supabase.
- **CI:** `.github/workflows/ci.yml` → lint + type-check + unit, then e2e smoke + prod build (bundle-size check). `npm run ci` runs the core gate locally.

---

## Known debt (deferred behind validation)

God-store (state + DB + orchestration in one file) · a few large feature files · duplicated week-math · inline styles vs a unified token system · single real provider (Groq) for the core loop. None block the validation test; all are re-prioritized *after* the retention number exists.
