# Coheren

**An AI habit coach that turns any goal into one science-backed task a day — and adapts the plan when you slip.** The user does the doing, not the planning.

> One line: *Tell it your goal → answer a short diagnostic → get a personalized 90-day plan → do one task a day → the plan recalibrates weekly.*

---

## What it is

Most goal apps hand you **more** to manage. Coheren does the planning for you and asks for one thing a day. The differentiation isn't the todo list — it's a **blocker-first** model of the user (which psychological pattern is actually stopping them) plus a **hand-curated behavioral-science corpus**, wired into a multi-agent LLM pipeline that keeps the model on a short leash.

**Current phase — validation.** The engine is built; what's unproven is whether a stranger comes back tomorrow. The near-term focus is a narrow-wedge retention test (see [Validation](#validation--current-focus)), not new features.

---

## The daily loop

```
open → see the ONE thing → do it (~15–30 min) → honest win → gently pulled back tomorrow
```

Onboarding is **value-first**: the user gets a profile + 7-day plan *before* the signup wall. Progress is **honest** — the streak breaks truthfully on a miss, missed days are shown, "↓X% vs last week" can actually go down.

---

## How it works — the 5-agent pipeline

Sequential agents, mostly Groq Llama. The design instinct: **the LLM only fills generative surface (task copy, questions); enums, counts, phase math, and the recalibration *decision* are computed in TypeScript.** Every output is normalized; the daily loop has a deterministic no-LLM fallback so it can't hard-fail.

| # | Agent | Tier | Job |
|---|-------|------|-----|
| A1 | **Goal Analyzer** | 70B | Free-text goal → structured domain/category/horizon/SMART + realism. A deterministic **feasibility anchor** (`feasibility.ts`) overrides the LLM's realism when the days×minutes math says the timeline is fantasy. |
| A2 | **Stone Identifier** | 70B | Short adaptive MI interview → a **"stone" profile**: which of a fixed **13-blocker taxonomy** is holding the user back. Bounded, cross-validated. Scale-backed stones (e.g. LowConfidence) get a **measured** severity from a validated micro-scale (`scales.ts`), not an LLM guess. |
| A3 | **Curriculum Builder** | 70B | Goal + stones + RAG → a phased month→week→day roadmap. Phase count & timeline are **formula-driven**, not LLM-decided. Rolling: only week 1 is fully populated. |
| A4 | **Task Generator** | 8B | Roadmap → one concrete daily task (30-30-40 segments, steps, "why this matters", success criteria, a curated resource). Has a **quality gate** that rejects vague tasks + retries on 70B, a Rickroll-URL sanitizer, and the deterministic fallback. |
| A5 | **Recalibrator** | 70B | Every 7 days computes performance signals **in TypeScript** (completion rate, skips, difficulty → RECOVER / SIMPLIFY / MAINTAIN / ACCELERATE) and tells the LLM to trust that decision, then rewrites the week. |

**Stones** = a fixed 13-type ontology (Logistical / Psychological / Cognitive / Behavioural): TimeConstraint, ResourceGap, EnvironmentFriction, Inconsistency, FearOfFailure, Perfectionism, LowConfidence, UnrealisticExpectations, FocusFragility, CognitiveFatigue, SkillGap, ProcrastinationPattern, Overcommitment.

---

## Tech stack

- **Frontend:** React 19 + Vite + TypeScript, Zustand store persisted to `localStorage` (`consist-storage`).
- **Backend:** Supabase — Postgres + **pgvector** + Auth + Edge Functions (Deno).
- **AI:** Groq (Llama `3.3-70b-versatile` for reasoning, `3.1-8b-instant` for economy). All LLM/embedding calls route through a **key-hiding `ai-proxy` edge function** — no provider keys in the browser.
- **RAG:** Jina v3 embeddings → pgvector cosine (`match_knowledge_chunks`) → Reciprocal-Rank-Fusion with client-side BM25 → Jina rerank. Corpus = the curated `src/knowledge/**` behavioral-science library (see below) + static chunks.
- **Analytics:** PostHog (thin wrapper in `src/lib/analytics.ts`, no-ops without a key).
- **Brand:** warm paper + ink + a terracotta "clay" accent (`#C4552D`).

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the deep technical map.

---

## Project structure

```
src/
  core/          # Domain logic — agents, RAG, store (no imports from features)
    agents/      # The 5-agent pipeline + feasibility.ts, stone-identifier/, schemas
    rag/         # Semantic retriever, knowledge base, RRF + rerank
    store/        # Zustand store
  features/      # UI surfaces — onboarding/, dashboard/ (Today, Journey, Progress, You)
  lib/           # Infra — supabase, ai-router, analytics, database, youtube, resources
  config/        # env.ts (throws on missing required vars), feature-flags.ts (frozen registry)
  knowledge/     # RAG CONTENT (not docs) — frameworks/*.md + domains/**/*.md, ingested to Postgres
  types/         # Shared types (@types-app)
supabase/
  migrations/    # 21 migrations, replay cleanly from empty, full RLS on all tables
  functions/     # ai-proxy (mandatory), send-reminders (web-push, not deployed for the test)
  seed.sql       # RAG embeddings seed (~5.6 MB) — loaded on db reset
scripts/         # ingest-knowledge, verify-rag, retention.sql, test harnesses
e2e/             # Playwright smoke/auth/dashboard tests
```

**Nav / app steps** (there is no router — navigation is store state): `0` landing · `1` chat onboarding · `2` dashboard · `3/4` auth signup/signin · `10` settings.

**Data model** (Postgres tables): `profiles`, `user_goals`, `roadmaps`, `daily_tasks`, `goal_stones`, `task_feedback`, `checkpoints`, `knowledge_chunks` (pgvector), `sprint_memories`, `push_subscriptions`, `ai_rate_limit`.

---

## Getting started

```bash
npm install
npm run dev            # http://localhost:5173  (needs local Supabase running)
```

**Environment.** Copy `.env.example` → `.env`. Only two vars are hard-required to boot: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Everything else degrades gracefully (push disables without VAPID, analytics no-ops without `VITE_POSTHOG_KEY`, Claude/Jina off by default). Edge-function secrets live in `supabase/functions/.env` — `GROQ_API_KEY` is the one that matters. **Never commit `.env` or `supabase/functions/.env`.**

### Common commands

| Command | What |
|---|---|
| `npm run dev` | Start the app |
| `npm run build` | Prod build (`tsc -b && vite build`) — the real type gate |
| `npm run lint` / `npm run type-check` | ESLint / `tsc --noEmit` |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e:smoke` | Playwright smoke suite |
| `npm run ci` | lint + type-check + unit + e2e smoke (what CI runs) |
| `npm run db:reset` | Reset local DB + reload seed (RAG data) |
| `npm run rag:ingest` | Embed `src/knowledge/**` + upsert to `knowledge_chunks` |
| `npm run rag:verify` | Check row count + a test semantic query |

---

## The knowledge corpus (`src/knowledge/`)

**These `.md` files are application data, not documentation** — `scripts/ingest-knowledge.ts` embeds them into `knowledge_chunks` and the agents retrieve against them. Do **not** delete them.

- `frameworks/` (~20 files) — attributed behavioral science: Fogg Behavior Model, the Habit Loop, Atomic Habits' Four Laws, implementation intentions (Gollwitzer), Lally's ~66-day automaticity, Self-Determination Theory, deliberate practice (Ericsson), Motivational Interviewing, Wendy Wood's context-habits, and more.
- `domains/**` (~27 files across cognitive / kinesthetic / career / financial / creative / health / lifestyle / coaching) — domain-specific progressions used to ground curriculum + task generation.

---

## Validation — current focus

The product hypothesis being tested is the only one that matters for a habit app: **will a stranger come back and do a task tomorrow?** Instrumentation for this shipped ahead of any redesign:

- **Activation funnel** events (PostHog): `landing_view → onboarding_started → onboarding_completed → signup → task_completed`.
- **The number** — `scripts/retention.sql`: active-return **D1/D2/D4/D7** and an **activation gate** (did they complete task 1/2/4/7), computed from existing data (`auth.users.created_at` anchor + `daily_tasks.completed_at`). No app code needed to read it.
- **Wedge:** exam relearners (one exam — e.g. NCLEX/GRE), recruited by hand, nudged concierge-style (manual email), measured over ~2 weeks.

Everything else (design-system unification, real conversational coach, Stripe/paywall, real web-push, dark mode) is **frozen** until that number earns it.

---

## Testing & CI

- **Unit:** Vitest — agent pipeline (`feasibility`, `scales`, `repair-json`, `task-generator`, `recalibrator`), difficulty monitor. `npm run test`.
- **E2E:** Playwright — smoke/auth/dashboard, seeded via `addInitScript` + a `sb-127-auth-token` JWT. `npm run test:e2e`.
- **CI** (`.github/workflows/ci.yml`): lint + type-check + unit, then e2e smoke + a prod build with a bundle-size check.
