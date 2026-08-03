# Coheren — System Internals (how the machine works)

A plain-language, founder-facing walkthrough of how the app actually functions, end to end. For the product overview see the [README](../README.md); for the layered technical map see [ARCHITECTURE.md](ARCHITECTURE.md). Everything here is traced to live code.

**The one governing idea:** structure and math are done in plain code (reliable, predictable); only the creative writing is left to the AI. Phase counts, timeline length, rest days, the recalibration decision — all formulas. Lesson wording — the LLM. This "short leash" is why the output is consistent, not random.

---

## 1. Sign-in & identity

- **The client** (`lib/supabase.ts`) is one shared Supabase connection set to persist your session, auto-refresh the token, and handle redirect logins. Your login token lives in browser **localStorage**.
- **Five thin auth functions:** `signUp` (email+password, then creates a `profiles` row; if that fails you still get in), `signIn`, `signOut`, an inline `getSession`, and `onAuthStateChange` (the listener). **Email confirmation is OFF** (`config.toml`) — new users are logged in instantly. Min password length is 6.
- **Two things persist across reload:** Supabase's session token, and the app's entire Zustand store under `consist-storage`. That's why the dashboard paints instantly before the network confirms you.
- **The auth listener** (`App.tsx`) sets the user, fires a one-time `signup` event for brand-new accounts (<5 min old), reads *live* store state so a token refresh doesn't wipe your screen, and either hydrates an existing roadmap → dashboard, or routes to onboarding.
- **What identifies you:** your `auth.users.id` (UUID). The database enforces per-user isolation itself via **Row-Level Security** — every table has `auth.uid() = user_id` policies, so Postgres refuses to return another user's rows even if the frontend asked wrongly. A real strength.

## 2. API keys & how they stay hidden

- **One gateway:** the `ai-proxy` edge function (server-side) is the *only* place real keys exist. Every AI call: verify login (401 if anonymous) → per-user rate limit (429 if over) → **inject the real provider key** → stream the answer back.
- **The hiding trick:** the browser's Groq client uses a *dummy* key `'proxy'` pointed at the gateway; a custom `fetch` swaps in your login token and strips key headers. Network inspection reveals only *your own login token*, never a provider key.
- **Where keys live:** client (public, safe) = `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, public VAPID key. Server-only (edge secrets) = `GROQ_API_KEY`, `ANTHROPIC_API_KEY`, `JINA_API_KEY`, `VAPID_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Both `.env` files are gitignored.
- **On by default:** **Groq only.** Claude is off (paths dormant, router falls back to Groq). Jina runs only when RAG retrieval fires.
- **Models:** `llama-3.3-70b-versatile` for the thinking agents; `llama-3.1-8b-instant` for daily task generation. 70B auto-drops to 8B on rate-limit. 30s timeout + retry per call.
- **Rate limiting:** an atomic Postgres counter (`ai_rate_limit` + a server-only RPC), **60 req/min/user**, fails open.

## 3. The engine — chat → interview → stones → syllabus → daily task

A **5-agent assembly line** (`core/agents/`) coordinated by `orchestrator.ts`.

**Chat** (`ChatOnboarding.tsx`) — an extraction bot pulls goal, category, experience, timeline, daily time over ~3–4 turns. A **feasibility gate** (real `days × minutes` vs an hours-to-competence table) makes the AI push back on fantasy timelines with real numbers.

**Agent 1 — Goal Analyzer** (70B) — raw goal → structured domain, complexity, horizon, realistic timeline, milestones, obstacles.

**Agent 2 — Stone Identifier** (70B) + the interview — a 5–7 question Motivational-Interviewing interview + two 1–10 rulers → your **"stone profile"**: which of a fixed **13-blocker taxonomy** (FearOfFailure, Perfectionism, Procrastination, TimeConstraint…) blocks you, each with a severity. Bounded (only those 13, capped at 4, cross-validated) — not free-form. Some severities are now scored deterministically from the confidence ruler.

**Agent 3 — Curriculum Builder — how the syllabus is designed:**
- **Phase count** — formula: ≤90 days → 2; >365 → 4; else 3.
- **Timeline** — `adjusted = requested × √(60 / daily_minutes)`. Doubling daily time doesn't double learning, so it uses a square root. 15 min/day on a 90-day goal → ~180 days. Stone multipliers add buffer (Procrastination/Inconsistency +10%, early-stage +15%).
- **Phase shape** — Dreyfus split (Foundation 33% / Development 42% / Mastery 25%), bent by stones.
- **What you study** — the LLM writes it, forced onto rails by three code inputs in the prompt: (1) **DOMAIN_PEDAGOGY** — a hardcoded teaching framework per domain (Cognitive = Spaced Repetition + Interleaving; Kinesthetic = Sports Periodization; Career = Build→Signal→Connect→Convert) — this is why a coding plan and a running plan differ structurally; (2) **RAG** — real science passages retrieved from your library and pasted in, so the AI paraphrases rather than invents; (3) **STONE_MODIFICATIONS** — concrete syllabus edits per blocker, severity-sorted.
- **Conflict resolution** — `STONE_DOMAIN_TIEBREAKERS` handle domain-vs-stone contradictions (Career wants public work early, FearOfFailure forbids it → redefine "artifact" per phase). Without these the AI would silently drop one instruction.
- **Rolling curriculum** — only **Week 1** is fully written (enforced in code); later weeks come back "tentative" and are filled one at a time by Agent 5 as you progress. Day 7 is forced to be a rest day.

**Agent 4 — Task Generator** (8B) — one roadmap day → today's concrete task. Fetches a curated resource first, runs its own RAG query, applies per-stone **delivery rules** (Procrastination → 2-min "starter step"; Perfectionism → time-box every step), and enforces **30-30-40** structure (30% learn / 30% drill / 40% apply, summing to your time budget). A **quality gate** rejects vague tasks and retries on 70B; a **no-LLM fallback** guarantees the daily loop can't hard-fail.

**Agent 5 — Recalibrator** (weekly) — the RECOVER/SIMPLIFY/MAINTAIN/ACCELERATE decision is **pure TypeScript** from your completion rate, skip streaks, skip *reasons*, and difficulty. The AI is told "the decision is given — trust it," then writes next week's 7 days around it. That rewritten week feeds the next tasks.

## 4. RAG — how "what to study" stays grounded

Query → **Jina embedding** → **Postgres pgvector** cosine search → (hybrid) merged with keyword BM25 via Reciprocal-Rank-Fusion → optional Jina rerank → pasted into the agent's prompt. Domain/stone tags boost the right passages. The corpus is `src/knowledge/`: **domains/** (what to study) + **frameworks/** (how people learn/change — Atomic Habits, spaced repetition, deliberate practice, SDT…). Every retriever fails gracefully to empty, so agents fall back to hardcoded pedagogy.

## 5. Scalable? Flexible? Routes? Codebase health? (honest read)

**Routes — there is no router.** Navigation is plain state: a numeric `step` (0 landing, 1 onboarding, 2 dashboard, 3/4 auth, 10 settings) + a `currentView` inside the dashboard. Consequence: no per-screen URLs — no deep-linking, no refresh-to-tab, no Back button between views; the dashboard tab resets to "Today" on reload. Simple and fast now; the wall when you later want shareable links or SEO.

**Size:** ~154 files, ~41,500 lines. Not bloated, but weight is concentrated. Biggest: `resourceLibrary.ts` (2,006, a static data blob), `ChatOnboarding.tsx` (1,698), `LandingPage.tsx` (1,542), `TodayView.tsx` (1,418), `curriculum-builder.ts` (1,321), `task-generator.ts` (1,283), `useStore.ts` (1,217), `recalibrator.ts` (955).

**Scalable / clean:**
- Stateless edge gateway (secrets server-side, streams, rate-limited).
- RAG in Postgres/pgvector — scales with the DB, not the browser.
- Provider abstraction — swapping/adding an LLM vendor is a config change.
- Agents are stateless functions (input → output).
- RLS everywhere — the DB enforces per-user isolation.
- Clean layering — `core` never imports `features`; no cross-feature imports (one minor `lib → core` leak).
- 40 feature flags, precedence localStorage > env > default.

**Not scalable (watch-outs):**
- **The god-store** (`useStore.ts`, 1,217 lines) — one object holds auth, onboarding, roadmap, tasks, streak + dozens of actions, and the *whole thing* is serialized to localStorage. The #1 structural debt.
- **One provider in practice** — every live tier is Groq. One rate-limit ceiling, one point of failure.
- **Spiky first-run cost** — onboarding fires all 5 agents + RAG embeds synchronously under the 60/min cap; the practical bottleneck as signups grow.
- **No routing** — as above.

**Bottom line:** the architecture is genuinely good (layered, secrets hidden, DB-enforced security, deterministic-control agents, real science grounding). The limits are the concentration of weight (god-store, a few 1,000+-line files) and the single-vendor + no-router choices — all deferred debt, none blocking the retention test.
