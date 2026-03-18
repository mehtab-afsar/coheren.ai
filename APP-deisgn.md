# Coheren — Complete App Deep Dive

> Everything about how this app works, in plain words.

---

## What Is Coheren?

Coheren is a **personal goal coach app** powered by AI. You tell it your goal — "I want to learn boxing", "I want to get a software job in 6 months", "I want to build a morning routine" — and the app builds you a day-by-day curriculum tailored to your goal AND your behavioral obstacles (the mental/logistical reasons people fail).

**The core idea**: Most apps give everyone the same plan. Coheren detects what's actually stopping *you* (perfectionism, lack of time, procrastination, fear of failure, etc.) and builds the curriculum around those obstacles.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript |
| Styling | Tailwind CSS 4 (mobile-first, custom breakpoints) |
| Animations | Framer Motion 12 |
| State | Zustand 5 (persisted to `localStorage`) |
| Database | Supabase (PostgreSQL + Auth + pgvector) |
| AI Models | Groq — llama-3.3-70b (premium) + llama-3.1-8b (economy) |
| Embeddings | Jina AI v3 (for semantic search) |
| Analytics | PostHog |
| Push Notifications | Service Worker (Workbox) |

---

## The App Journey (Start to End)

### Step 0: Landing Page
User types their goal. Example: *"I want to learn boxing in 3 months"*. This gets saved and they're moved to chat onboarding.

### Step 1: Chat Onboarding
A conversational AI chat (not a form) that:
1. Greets the user with their goal
2. Clarifies timeline, daily time available, current skill level, energy patterns
3. Runs the 5-agent pipeline behind the scenes
4. Shows stone diagnostic questions (behavioral interview)
5. Collects answers, builds the full curriculum
6. Moves user to dashboard

**Shadow Extractor**: A background LLM (economy model) runs on every chat message to silently parse structured data (dailyTime, timeline, skillLevel) from natural language — so the user never fills out a form.

### Step 2: Dashboard
User lands on Today view with Day 1 task ready. From here:
- Complete tasks every day
- Get a new task each day
- Every 14 days: checkpoint + curriculum recalibration

---

## The 5-Agent AI Pipeline

This is the intelligence layer. Five AI agents run in sequence during onboarding and then on an ongoing basis.

```
Goal Text + Chat Context
        ↓
  [Agent 1] Goal Analyzer
  "What kind of goal is this? Is it realistic?"
        ↓
  [Agent 2] Stone Identifier
  "What's blocking this person?"
        ↓
  [Agent 3] Curriculum Builder
  "Build a phased roadmap for this goal + this person's obstacles"
        ↓
  [Agent 4] Task Generator (runs every day)
  "Generate today's specific task"
        ↓
  [Agent 5] Recalibrator (every 14 days)
  "Based on performance, adjust the plan"
```

---

### Agent 1 — Goal Analyzer

**File**: `src/core/agents/goal-analyzer.ts`
**Model**: llama-3.3-70b (premium, temperature 0.2 — precise)
**When**: Once, at onboarding

**What it does**: Turns a raw goal sentence into structured data that every other agent uses.

**Output includes**:
- **Domain**: What type of learning is this? (Kinesthetic, Cognitive, Career, Financial, Creative, Health, Lifestyle, Hybrid)
- **Category**: Specific activity (e.g., "Boxing", "Web Development", "Guitar")
- **Horizon**: Short-term (<90 days), Mid-term (90–365 days), Long-term (>365 days)
- **Intensity**: Low, Moderate, High, Extreme (based on effort required)
- **Complexity/Skill Level**: beginner, intermediate, advanced
- **SMART Validation**: Is the goal Specific, Measurable, Achievable, Relevant, Time-bound?
- **Realism Check**: Is the timeline realistic? Is the effort realistic?
- **Risk Flags**: Burnout risk, vague fantasy, experience gap

**Why it matters**: Every downstream agent reads this. Wrong domain classification = wrong curriculum.

---

### Agent 2 — Stone Identifier

**Files**: `src/core/agents/stone-identifier/`
**Model**: llama-3.3-70b (premium, temperature 0.3)
**When**: Once, at onboarding (runs twice in two modes)

**The concept of "Stones"**: In behavioral psychology, obstacles to goal achievement are predictable patterns — not unique to individuals. Coheren calls these "stones" (things that trip you up). There are 13 stone types across 4 categories:

| Category | Stones |
|----------|--------|
| **Logistical** | TimeConstraint, ResourceGap, EnvironmentFriction |
| **Psychological** | Inconsistency, FearOfFailure, Perfectionism, LowConfidence, UnrealisticExpectations |
| **Cognitive** | FocusFragility, CognitiveFatigue, SkillGap |
| **Behavioral** | ProcrastinationPattern, Overcommitment |

**Mode 1 — Question Generator**: Given the domain and goal, generates 4–5 diagnostic interview questions. Each question is designed to probe a specific readiness gap. Example for boxing:
- "When you've tried to build a new habit in the past, what usually caused you to stop?" → probes Inconsistency, ProcrastinationPattern
- "How do you feel when you fail at something new?" → probes FearOfFailure, LowConfidence

**Mode 2 — Stone Extractor**: After the user answers the questions, the agent analyzes all answers and identifies:
- **Primary Stone** (the main obstacle)
- **Secondary stones** (comorbid obstacles)
- **Severity** per stone: Low, Moderate, High, Critical
- **Guidance** for Agent 3 (curriculum modifications to make)
- **Note** for Agent 5 (what to watch for in recalibration)
- **User Archetype** label (e.g., "The Constrained Achiever")

---

### Agent 3 — Curriculum Builder

**File**: `src/core/agents/curriculum-builder.ts`
**Model**: llama-3.3-70b (premium, temperature 0.3)
**When**: Once, at onboarding (re-runs at each checkpoint recalibration)

**The most important agent.** Takes Agent 1 + Agent 2 output and builds a multi-phase roadmap.

**Three layers of intelligence:**

#### Layer 1: Domain Pedagogy (hardcoded frameworks, not LLM-invented)
Every domain gets a proven pedagogical framework injected:

| Domain | Framework |
|--------|-----------|
| Kinesthetic (boxing, guitar) | Sports Periodization: Foundation → Development → Performance → Deload |
| Cognitive (programming, exams) | Spaced Repetition + Interleaving |
| Career | Build → Signal → Connect → Convert |
| Financial | Knowledge Laddering + Gradual Exposure |
| Creative | Divergent → Convergent Cycles |
| Health | Behavioral Activation + Habit Stacking |
| Lifestyle | Keystone Habit + Identity Anchoring |
| Hybrid | Parallel Tracks with Integration Points |

#### Layer 2: Stone Modifications (hardcoded rules)
Each stone modifies the curriculum in specific ways:

| Stone | What changes |
|-------|-------------|
| TimeConstraint | Micro-sessions only, compress Phase 1 by 20%, remove supplementary content |
| Inconsistency | 3-day micro-sprints with catch-up days |
| Perfectionism | Every task time-boxed, "ship-it" gates at each phase |
| ProcrastinationPattern | Front-load hardest tasks, starter step always ≤2 min |
| FearOfFailure | Private work in Phase 1, no public output until Phase 3 |
| CognitiveFatigue | Max 3 steps per task, mandatory break after step 2 |
| Overcommitment | Hard cap at 85% of declared daily time |
| FocusFragility | Single-focus tasks only, environment setup step always first |
| LowConfidence | Easy success criteria, "You Already Know This" connections |
| UnrealisticExpectations | Calibration checkpoints, realistic benchmarks added |
| SkillGap | Phase 0 prerequisite sprint added if needed |

#### Layer 3: Domain × Stone Tiebreakers
When domain framework and stone modification conflict, a specific rule resolves it. Example:
- **Career + FearOfFailure**: Career says "build portfolio" (public), FearOfFailure says "avoid public work". Resolution: Phase 1 private drafts → Phase 2 unpublished → Phase 3 public

**Phase count** (deterministic, based on horizon):
- Short-term (<90 days): 2–3 phases
- Mid-term (90–365 days): 3–4 phases
- Long-term (>365 days): 4–5 phases

**Output**: A full `Roadmap` object with:
- Phases (each with goals, focus areas, milestones, scientific rationale)
- Rest days schedule
- Review moments (spaced at +1, +3, +7, +14 days after phase milestones)
- Stone modifiers applied

---

### Agent 4 — Task Generator

**File**: `src/core/agents/task-generator.ts`
**Model**: llama-3.1-8b (economy — runs daily, must be fast and cheap)
**When**: Every single day (or pre-generates a batch of 7 at onboarding)

**What goes into each task prompt** (the context Agent 4 sees):
1. Where in the curriculum: Day X, Phase Y, Week Z, X% through phase
2. Phase context: goals, milestones, scientific rationale, focus areas
3. Stone delivery rules: specific instructions based on detected stones
4. Domain delivery rules: domain-specific formats (kinesthetic = body cues, financial = simulation labels)
5. RAG context: relevant behavioral science retrieved from the knowledge base
6. Previous 5 tasks: to avoid repetition
7. Session blueprint: how to structure time blocks for today's duration
8. Curated resource URLs: real YouTube videos matched to the goal topic

**Stone delivery examples**:
- ProcrastinationPattern: "First step must be ≤ 2 minutes"
- Perfectionism: "Include explicit time-box on every step, use 'Done > Perfect' framing"
- FearOfFailure: "Frame entire task as 'Experiment:', use observation-based success criteria"
- CognitiveFatigue: "Max 3 steps total, mandatory 5-minute break after step 2"

**Progression curve** (varies by phase progress):
- 0–20% through phase → simple, achievable (build momentum)
- 20–50% → moderate challenge
- 50–80% → stretch tasks
- 80–100% → consolidation and integration

**Post-LLM validation** (hardcoded checks before showing to user):
- Minimum 3 steps (inserts starter step if fewer)
- Minimum 6 words per step (catches vague AI output)
- Rejects steps containing: "practice", "study", "learn", "understand", "feel", "get comfortable" (too vague)
- Clamps estimated minutes to daily time budget
- Strips fake YouTube URLs (placeholder video IDs like Rick Astley)

**Fallback Generator** (`fallback-task-generator.ts`): If Agent 4 fails for any reason (rate limit, timeout, bad JSON), a completely deterministic (no LLM) fallback generates a valid task. Always succeeds.

---

### Agent 5 — Recalibrator

**File**: `src/core/agents/recalibrator.ts`
**Model**: llama-3.3-70b (premium)
**When**: Every 14 days at checkpoint, OR early trigger after 3+ hard skips

**Pre-computed performance signals** (TypeScript math, not LLM):
```
completionRate      = (completed tasks / total tasks) × 100
avgDifficulty       = average of difficulty ratings (1–5)
consecutiveSkips    = longest streak of skipped days
difficultySkips     = skips where reason = 'difficulty'
timeSkips           = skips where reason = 'time'
avgTimeOverage      = avg(actualDuration - dailyBudget)
```

**Status determination** (hardcoded thresholds):
```
completionRate < 60% OR (avgDiff > 4 AND diffSkips ≥ 2)  → SIMPLIFY
healthSkips ≥ 3 OR consecutiveSkips ≥ 4                  → RECOVER
completionRate ≥ 80% AND avgDiff ≤ 2.5                   → ACCELERATE
otherwise                                                  → MAINTAIN
```

**Stone × Status directive matrix** (13 stones × 4 statuses = 52 rules):
Every stone has specific adaptation instructions per status. Example:
| | TimeConstraint | ProcrastinationPattern | FearOfFailure |
|-|----------------|----------------------|---------------|
| ACCELERATE | Allow 10% over time budget | Reduce scripted steps | Add optional challenge rep |
| MAINTAIN | Keep time-boxing | Vary starter step format | Keep "Experiment:" framing |
| SIMPLIFY | Reduce scope 20% | Starter step ≤ 90 seconds | Reframe failure as data |
| RECOVER | 50% of declared time only | Every task = 3 min starter only | "Curiosity Sprint" — no performance goals |

**What happens after recalibration**:
1. All future tasks (from today+1) are deleted
2. 14 new tasks are generated using recalibrated parameters
3. New tasks replace old ones in the store

---

## Session Planner (New Feature)

**File**: `src/core/agents/session-planner.ts`

A deterministic (no LLM) engine that takes the day's available time and produces a **session blueprint** — a structured block schedule. This blueprint is injected into Agent 4's prompt so tasks naturally follow a pedagogically sound structure.

**Block types**: warmup, review, learn, practice, drill, cooldown, assessment

**Phase-aware ratios** (lean/practice split adjusts over time):
- Early phase (0–30%): 60% learning / 40% practice
- Mid phase (30–70%): 50/50
- Late phase (70–90%): 35% learning / 65% practice
- End phase (90–100%): 25% learning / 75% practice (consolidation)

**Time-based templates**:
- 15–20 min: warmup → single main block → note
- 30–45 min: warmup → learn → practice → reflection
- 60 min: warmup → review → learn → practice → cooldown
- 90+ min: full structure with drill and assessment blocks
- 120+ min: extended structure with mid-session break

**Example for 60 minutes, boxing, mid-phase**:
```
5 min   → Warmup (light shadow boxing, review yesterday)
10 min  → Review (revisit last session's correction)
20 min  → Learn (new technique: right hook mechanics)
20 min  → Practice (drill into bags/pads)
5 min   → Cooldown (stretching + mental review)
```

---

## The Knowledge Base & RAG System

### Why it exists
Rather than the LLM making up behavioral science principles, Coheren injects real, cited research into agent prompts. This keeps curriculum and coaching grounded in evidence.

### Three tiers of knowledge:

**Tier 1: Static Chunks** (`src/core/rag/knowledge-base.ts`)
21 evidence-based chunks, properly cited:
- Self-Determination Theory (Ryan & Deci, 2000) — autonomy, competence, relatedness
- Habit Loop (Duhigg) — cue → routine → reward
- Four Laws of Behavior Change (James Clear)
- Tiny Habits / B=MAP (BJ Fogg) — Behavior = Motivation × Ability × Prompt
- Neuroplasticity — BDNF, sleep consolidation
- Habit formation timeline — Lally et al. (66 days average, range 18–254)
- Growth Mindset (Dweck)
- Deliberate Practice (Ericsson)

**Tier 2: Domain Frameworks** (`src/knowledge/`)
33 markdown files covering:
- Cognitive: programming, language learning, exam prep
- Kinesthetic: running, strength training, martial arts
- Career: job search, skill development, freelancing
- Financial: investing, budgeting, side income
- Creative: writing, music, video content
- Health: weight loss, sleep, mental health
- Lifestyle: morning routine, social skills
- Coaching protocols: procrastination, fear of failure, perfectionism, consistency, confidence

**Tier 3: Semantic Retrieval** (`src/core/rag/semantic-retriever.ts`)
- Query → Jina AI v3 embeddings → Supabase pgvector cosine search
- Similarity threshold: 0.25
- Returns top 6 matching chunks
- Falls back to static keyword matching if Jina unavailable

**How it's used**: Agent 3 retrieves 3–6 relevant chunks for curriculum rationale. Agent 4 retrieves domain-specific expert coaching per task. Agent 5 retrieves recovery protocols if status = RECOVER.

---

## Resource Library

**File**: `src/lib/resourceLibrary.ts`

Curated real YouTube videos matched to goal categories. Solves the problem of the AI making up fake or irrelevant video URLs.

**Coverage**: Guitar (JustinGuitar, Marty Music), Boxing (FightTips, Tony Jeffries), Coding (freeCodeCamp, Traversy Media), Fitness (ATHLEAN-X, Chloe Ting), Exam Prep.

**How matching works** (`src/lib/resourceMatcher.ts`):
1. Extract keywords from the task title and stone domain
2. Look up `KEYWORD_TO_TOPIC_MAP` (e.g., "punch" → boxing, "spar" → boxing)
3. Get curated resources for that topic
4. Inject real URLs into Agent 4's prompt: *"You MUST use URLs from this list"*
5. Post-generation: validate all URLs aren't placeholders; drop any fake ones

**Goal → Library mapping** (`GOAL_KEYWORD_TO_LIBRARY_KEY`): Maps goal text keywords to library categories (e.g., goal text contains "boxing" → fetch boxing resources, goal contains "guitar" or "music" → fetch guitar resources).

---

## Database Schema

All data lives in Supabase (PostgreSQL). Row-Level Security (RLS) ensures users can only see their own data.

### Tables

**`profiles`**
Stores: full name, location, bio, persona traits (JSONB), streak count.
Created automatically when user signs up.

**`user_goals`**
Stores: goal title, description, goal analysis output (JSONB from Agent 1), status (active/paused/completed).
One active goal per user at a time.

**`goal_stones`**
Stores: stone question, user answer, stone impact data, priority order.
One row per diagnostic question answered.

**`roadmaps`**
Stores: goal reference, phases array, configuration (JSONB with full Agent 3 output including pedagogy, phase data, checkpoints).

**`daily_tasks`**
Stores: day number, title, content (JSONB with steps, tips, resources), completion status, difficulty rating, actual duration, skip reason.

**`task_feedback`**
Stores: difficulty score (1–5), actual duration, feedback tags, user comment, task/goal/user references.
This is what Agent 5 reads for recalibration.

**`knowledge_chunks`**
Stores: chunk text, embedding vector (pgvector), category, keywords, source.
Supports the `match_knowledge_chunks()` RPC for semantic search.

**`checkpoints`**
Stores: checkpoint analysis results, Agent 5 output, sprint adaptations.

**`agent_logs`**
Stores: agent name, run type, input hash, output JSON (trimmed to 10KB), latency, model used, success/error state.
Used for debugging and monitoring agent quality.

### Key Gaps
- Daily tasks generated after onboarding are **stored in localStorage only** — not synced back to Supabase
- If a user clears browser data, roadmap + task history is gone
- Checkpoints and task feedback ARE synced to DB

---

## State Management

**File**: `src/core/store/useStore.ts`
**Library**: Zustand 5 with `persist` middleware
**Storage key**: `consist-storage` (localStorage)

### What's in the store:

```
user                  — Supabase auth user object
isAuthenticated       — boolean
step                  — 0 (landing) | 1 (chat) | 2 (dashboard) | 3 (signup) | 4 (signin) | 10 (settings)
initialGoal           — raw goal text from landing page
universalProfile      — parsed: goal, timeline, dailyTime, skillLevel, energyPattern
currentGoal           — { category, specificGoal, skillLevel }
agentRoadmap          — full Agent 3 output (Roadmap with phases)
stoneProfile          — Agent 2 output (stone types, severities, guidance)
tasks                 — Task[] (all generated tasks)
currentDay            — which day of curriculum they're on
currentWeek           — current week number
streak                — consecutive days completed
completionRate        — percentage of tasks completed so far
lastCheckInDate       — ISO date string
performanceHistory    — WeekPerformance[] (weekly summary data)
```

### Task model:
```typescript
{
  id: string
  title: string
  description: string
  type: 'practice' | 'learning' | 'reflection' | 'challenge' | 'retrieval' | 'assessment'
  duration: number            // estimated minutes
  completed: boolean
  skipped: boolean
  skipReason?: string
  difficultyRating?: 1|2|3|4|5
  actualDuration?: number
  userComment?: string
  feedbackTags?: string[]
  resources?: { url, title, type, watchFrom, watchTo }
  assessmentQuestions?: AssessmentQuestion[]
  assessmentResults?: AssessmentResult[]
}
```

### Key actions:
- `completeTask(id)` — marks done, updates streak, syncs to Supabase
- `skipTask(id, reason)` — marks skipped, triggers difficulty monitor
- `setTaskFeedback(id, rating, duration, tags, comment)` — records performance data
- `advanceDay()` — increments day, triggers next task generation
- `generateNextDayTasks()` — async Agent 4 call (with fallback)

---

## Dashboard Features

### Today View
The main daily interface. Shows:
- **FocusCard**: Today's task with title, description, estimated time, steps, tips, success criteria, "Why This Matters"
- **Cinema Mode**: Full-screen video player (YouTube embed) with:
  - Timestamp-aware playback (watchFrom/watchTo)
  - Side-by-side step checklist
  - Focus timer (counts up while task active)
  - Video pause/play events tracked
- **AssessmentCard**: Quiz questions for knowledge verification (built but used when task type = assessment)
- **AllDoneCard**: Celebration screen when all day's tasks complete
- **RestDayCard**: Light recovery content on scheduled rest days
- **SmartBannerSlot**: Contextual tips/challenges

**Quick Mode**: Shows single task, clean layout, minimal distractions.
**Ease Back Mode**: Auto-limits to 1 task after returning from a break.

### Journey View
- Phase progress visualization
- Week cards (completed/current/future)
- Upcoming task preview

### Library View
- Browse curated resources
- Search by topic
- Resource cards with descriptions

### Progress View
- Streak calendar
- Completion rate trend
- Difficulty trend
- Coach summary messages
- Week-over-week comparison

### Insights View (new)
- **Difficulty Trend**: SVG line chart of avg difficulty per week
- **Task Type Breakdown**: Stacked bars (practice/learning/reflection split + completion rates)
- **Skip Patterns**: Ranked reasons why tasks were skipped
- **Consistency Score**: Animated SVG ring — "X% of days you showed up"
- **Personal Records**: Best streaks, completion milestones

### You View
- Profile display
- Stone profile summary
- Self-assessment modal
- Personal records

### Roadmap View
- Full curriculum timeline visualization
- Phase breakdown with milestones

### Settings View
- Profile edit
- Notification preferences
- App preferences

---

## Onboarding Deep Dive

### Flow
1. **Landing** → User enters goal → store saves `initialGoal`
2. **Chat** → Shadow Extractor parses structured data from messages in background
3. **Analyzing screen** → "Analyzing your responses..." → "Building your profile..." (2 second animated transition)
4. **Stone Questions** → Premium card-style UI with:
   - Segmented progress bar
   - One question at a time with AnimatePresence slide transitions
   - Radio-style option cards for multiple choice
   - Scale input (1–10) for intensity questions
   - Text input for open-ended questions
   - Forward-only navigation (no going back)
5. **Curriculum generation** → Agent 3 + Agent 4 batch runs
6. **Dashboard** → User lands on Day 1

### Deduplication
The stone questions are filtered to avoid asking things already covered in chat. The chat collects: dailyTime, currentSkillLevel, energyPattern, timeline, specificGoal. If a stone question would probe the same field, it's filtered out before showing to the user.

---

## Mobile Experience

The app is fully mobile-first with:
- **BottomNav**: 4-tab nav (Today / Journey / Library / You) — fixed at bottom, safe-area-inset-bottom aware
- **Sidebar hidden on mobile** (replaced by BottomNav)
- **Cinema Mode full-screen** on mobile (no sidebar overlay)
- **Safe-area insets** for notched devices (iPhone X+)
- **Custom breakpoints**: xs=375px, sm=390px, md=768px, lg=1024px, xl=1280px
- **`useBreakpoint()`** hook: sync init via `matchMedia` (no flash on load)
- **Text clamping** for responsive font sizes
- **Touch-action** CSS rules for smooth scrolling

---

## Notifications

Two daily push notifications via Service Worker:
- **9:00 AM**: Morning reminder to complete today's task
- **8:00 PM**: Evening check-in reminder

Implementation: `src/hooks/useNotifications.ts` → calculates `ms` until next 9 AM / 8 PM → `setTimeout` → `navigator.serviceWorker.controller.postMessage()` → SW shows notification.

Gated by `PUSH_NOTIFICATIONS` feature flag.

---

## Analytics

**Library**: PostHog (privacy-respecting product analytics)
**File**: `src/lib/analytics.ts`

Typed events tracked:
- `user_identified` — on auth
- `onboarding_started`, `onboarding_completed`
- `task_completed`, `task_skipped`
- `checkpoint_triggered`, `checkpoint_completed`
- `view_changed` — which dashboard tab
- `cinema_mode_started`

Silent failures — if PostHog isn't configured, nothing breaks.

---

## Feature Flags

**File**: `src/config/feature-flags.ts`

Flags can be toggled per-device without deploying:

| Flag | Default | Controls |
|------|---------|----------|
| `USE_AI_AGENTS` | `true` | Enable full agent pipeline |
| `USE_RAG` | `true` | Semantic knowledge retrieval |
| `USE_RECALIBRATION` | `true` | Agent 5 checkpoint system |
| `LOG_AGENT_RUNS` | `true` | Write agent runs to `agent_logs` |
| `PUSH_NOTIFICATIONS` | `true` | Service worker notifications |
| `DEBUG_PANEL` | `true` | Debug overlay in dev |
| `PREGENERATE_TASKS` | `true` | Batch generate first 7 tasks |

Override precedence: `localStorage` > `env var` > default
URL override: `?ff_USE_AI_AGENTS=false`

---

## AI Cost Structure

| Agent | Model | Frequency | Notes |
|-------|-------|-----------|-------|
| Shadow Extractor | 8b economy | Every chat message | Very cheap |
| Agent 1 | 70b premium | Once at onboarding | Medium cost |
| Agent 2 | 70b premium | Once at onboarding | Medium cost |
| Agent 3 | 70b premium | Onboarding + every 14 days | Medium cost |
| Agent 4 | 8b economy | **Every day** | Highest volume, kept cheap |
| Agent 5 | 70b premium | Every 14 days | Low frequency |
| Fallback | None (deterministic) | When Agent 4 fails | Zero cost |

Auto-fallback: If 70b hits rate limit → automatically retries with 8b. Exponential backoff (3 retries). Session-level telemetry tracks fallback frequency.

---

## Offline & Reliability

- **Offline detection**: `useOfflineSync()` hook tracks online/offline
- **Write queue**: Pending syncs queued while offline, flushed when back online
- **Offline banner**: Shown when not connected
- **Fallback task generator**: If Groq is unreachable, tasks still generate
- **RAG graceful degradation**: If Jina is unavailable, falls back to static knowledge base
- **Analytics graceful degradation**: If PostHog is unconfigured, silently skips
- **5s auth timeout**: Auth check won't hang the app indefinitely

---

## Security

- **RLS (Row-Level Security)** on all Supabase tables — users can only query their own data
- **RLS on `knowledge_chunks`** — public read, no writes from client
- **Task feedback INSERT/UPDATE** checks — user can only write their own feedback
- **Profiles DELETE** policy — can only delete own profile
- **No API keys in client code** — all AI calls go through environment variables

---

## What Works vs What's Pending

### Fully working:
- Onboarding → curriculum → daily tasks → completion → feedback
- Checkpoint every 14 days → recalibration → new sprint
- Stone-aware task modifications
- Cinema Mode with YouTube integration
- Streak tracking
- Mobile-first responsive layout
- Push notifications
- Fallback task generator
- Agent logging
- RAG semantic retrieval
- Resource matching (5 goal categories)

### Partially working / known gaps:
- **Daily tasks not synced to DB after onboarding** — only first batch saved to Supabase; subsequent days are localStorage-only
- **If localStorage clears, roadmap is gone** — no DB backup for roadmap/stone profile
- **Assessment questions generated but not always shown** — `AssessmentCard` exists but requires `task.type === 'assessment'` which Agent 4 doesn't always produce
- **Resource library covers only 5 categories** — goals outside guitar/boxing/coding/fitness/exam prep get AI-generated (sometimes placeholder) URLs
- **Difficulty monitor bug** — checks `skipReason === 'hard'` which isn't a valid skip reason; early recalibration never triggers from this path

### Conceptually planned but not yet built:
- Testing & revision system (knowledge verification, spaced retrieval)
- Intelligent time splitting for sessions (session planner injected into Agent 4, but UI not fully wired)
- Persistent DB sync for all daily tasks

---

## The Honest Technical Assessment

**What it actually is**: Rule-based personalization with AI-generated content. The frameworks, stone rules, delivery directives, and recalibration thresholds are all hardcoded TypeScript. The LLM handles:
- Extracting stone profile from answers
- Filling in specific task steps and tips
- Writing coaching messages
- Generating phase rationale

**What it isn't**: A learning system. The app doesn't learn from user behavior over time — it uses fixed thresholds and rules. Recalibration is deterministic (if completionRate < 60% → SIMPLIFY), not ML-based.

**Where the research comes from**: Stone taxonomy maps to validated psychological constructs (Self-Determination Theory, Habit Loop, Deliberate Practice, Implementation Intentions). Domain pedagogy inspired by sports science periodization, spaced repetition literature, and cognitive load theory.

**Where it's heuristic**: Stone severity scores (LLM estimate, not validated scale), recalibration thresholds (80%/2.5 avg difficulty — untested), stone modification percentages ("compress by 20%" — reasonable but arbitrary).

---

## Key File Map

| What you're looking for | Where it lives |
|------------------------|----------------|
| App routing + auth | `src/App.tsx` |
| All state | `src/core/store/useStore.ts` |
| Agent 1 | `src/core/agents/goal-analyzer.ts` |
| Agent 2 questions | `src/core/agents/stone-identifier/question-generator.ts` |
| Agent 2 extraction | `src/core/agents/stone-identifier/stone-extractor.ts` |
| Stone types | `src/core/agents/stone-identifier/stone-taxonomy.ts` |
| Agent 3 | `src/core/agents/curriculum-builder.ts` |
| Agent 4 | `src/core/agents/task-generator.ts` |
| Agent 5 | `src/core/agents/recalibrator.ts` |
| Orchestrator | `src/core/agents/orchestrator.ts` |
| Session planner | `src/core/agents/session-planner.ts` |
| Fallback tasks | `src/core/agents/fallback-task-generator.ts` |
| AI model routing | `src/lib/ai-router.ts` |
| Groq client | `src/lib/groq-client.ts` |
| Database operations | `src/lib/database.ts` |
| Resource library | `src/lib/resourceLibrary.ts` |
| Resource matching | `src/lib/resourceMatcher.ts` |
| RAG retrieval | `src/core/rag/semantic-retriever.ts` |
| Knowledge base | `src/core/rag/knowledge-base.ts` |
| Today view | `src/features/dashboard/views/TodayView.tsx` |
| Dashboard layout | `src/features/dashboard/index.tsx` |
| Chat onboarding | `src/features/onboarding/components/ChatOnboarding.tsx` |
| Stone questions UI | `src/features/onboarding/components/StoneQuestions.tsx` |
| All type definitions | `src/types/agents.ts` |
| DB migrations | `supabase/migrations/` |
| Feature flags | `src/config/feature-flags.ts` |

---

*Written 2026-03-18. Based on full source code review.*
