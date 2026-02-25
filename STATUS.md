# Coheren — Project Status

**Last updated:** 2026-02-25

---

## What is Coheren?

An AI-powered habit-coaching web app. Users describe a goal in a chat, the AI builds a personalised roadmap with daily tasks (practice / learning / reflection), and the app guides them day-by-day with check-ins and sprint recalibration.

**Stack:** React 18 + Vite + TypeScript · Zustand (persist) · Supabase (local Docker) · Groq AI · Tailwind CSS

---

## What's Done

### Core Product
- **Landing page** — hero section, science section, testimonials, pricing, CTA input that pre-fills the onboarding chat
- **AI onboarding chat** — Shadow Extractor agent extracts user profile from natural conversation; Building Stones questionnaire (multiple choice / yes-no / scale / open-ended)
- **5-agent AI pipeline:**
  - Agent 1 — Shadow Extractor (profile from chat)
  - Agent 2 — Goal Analyser (goal decomposition)
  - Agent 3 — Stone Collector (building-stone questions)
  - Agent 4 — Roadmap Builder (90-day roadmap with sprints)
  - Agent 5 — Task Generator (daily tasks with YouTube resources)
- **Dashboard** — sidebar navigation on desktop, bottom tab bar on mobile
  - **Today** — task list with cinema mode (embedded YouTube player + guide/notes panel), quick mode, ease-back mode, task completion particles, skip with reason
  - **Journey** — roadmap/sprint visualisation
  - **Library** — all resources (articles + videos) with article reader panel
  - **Progress / Goals / Profile** — stub views (scaffolded, not fully built)
- **Checkpoint screen** — every 7 days, shows sprint stats and triggers AI recalibration of the roadmap
- **Auth** — Supabase email/password, auth gate inside onboarding

### Infrastructure
- Supabase schema: `profiles`, `user_goals`, `goal_stones`, `roadmaps`, `daily_tasks`, `task_feedback`, `checkpoints`
- Seed data with test user (`seed@coheren.dev / SeedPass123!`)
- Groq model auto-fallback: `llama-3.3-70b-versatile` → `llama-3.1-8b-instant`
- PWA: manifest, icons (192 + 512), `viewport-fit=cover`, Apple home-screen meta tags
- `scripts/seed-dev.sh` — one-command DB reset + seed

### Mobile-First Redesign (just completed)
- Tailwind breakpoints overridden: `sm=390px`, `md=768px` (phone-first)
- `useBreakpoint` uses `matchMedia` initialiser — zero layout flash
- Bottom tab navigation on mobile (Today / Journey / Library / Profile)
- Cinema mode panel: full-screen overlay on mobile
- Library reader panel: full-width on mobile
- Safe-area-inset padding on input bars (iOS home indicator)
- Task checkbox: 40×40 px on mobile (was 28×28)
- `touch-action: manipulation` — removes 300 ms tap delay on iOS
- `-webkit-text-size-adjust` — prevents iOS font auto-resize

### Code Quality
- TypeScript: 0 errors
- ESLint: 0 errors, 0 warnings

---

## What Still Needs to Be Done

### High Priority

| # | Item | Detail |
|---|------|--------|
| 1 | **RAG knowledge base** | `src/knowledge/frameworks/` has the .md content but it hasn't been ingested into a vector store. The Groq agents currently run without retrieval. Need to choose a vector DB (e.g. pgvector on Supabase or Chroma) and wire it into the task-generator and roadmap-builder agents. |
| 2 | **UI error boundary** | No `<ErrorBoundary>` anywhere. A single JS error in TodayView crashes the whole app. Add a root-level and dashboard-level boundary with a friendly fallback UI. |
| 3 | **Financial domain handling** | Agent 4 (roadmap) has no special rules for financial goals (budgeting, investing). These need domain-specific sprint structures. |
| 4 | **Career + fear-of-failure tiebreaker** | When goal analysis detects both career and fear-of-failure signals, Agent 3 currently picks the wrong stone priority. Needs a tiebreaker rule. |
| 5 | **Agent 4 retry with 70b fallback** | Roadmap builder occasionally times out on the 8b model and returns a partial plan. No retry logic exists. Add: try 70b → on timeout retry once → surface error if both fail. |

### Medium Priority

| # | Item | Detail |
|---|------|--------|
| 6 | **Progress view** | Stub only. Should show a chart of completed tasks per day, streak history, task-type breakdown (practice / learning / reflection). |
| 7 | **Goals view** | Stub only. Should list all user goals with their stone answers and let the user add a second goal. |
| 8 | **Journey view polish** | Sprint cards render but the "current sprint" highlight and the "next sprint unlock" animation are missing. |
| 9 | **Swipe gestures (mobile)** | Swipe left/right to skip a task or open the cinema player. Planned in the mobile-first work but not implemented. |
| 10 | **Scroll behaviour** | `overscroll-behavior: contain` on the cinema panel and library reader to prevent the page scrolling behind them on mobile. |

### Lower Priority

| # | Item | Detail |
|---|------|--------|
| 11 | **Service worker / offline** | PWA manifest + icons are in place. Still need a service worker (Vite PWA plugin) to cache the shell and allow offline task viewing. |
| 12 | **Production env separation** | Single `.env` for all environments. Need `.env.production` with a real Supabase project and Groq rate-limit monitoring. |
| 13 | **Supabase RLS audit** | Row-level security policies exist in the schema but have not been reviewed end-to-end for the production data model. |
| 14 | **E2E test coverage** | No automated tests exist. Vitest is configured (`vitest.config.ts`) but no test files. Priority flows to cover: full onboarding, task complete, checkpoint. |

---

## Dev Quick-Start

```bash
# 1 — install
npm install

# 2 — start local Supabase
npx supabase start

# 3 — seed the database
bash scripts/seed-dev.sh

# 4 — run the dev server
npm run dev
```

Login with: `seed@coheren.dev` / `SeedPass123!`

Reset DB: `npx supabase db reset`
