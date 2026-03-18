# Coheren — Design Specification

> Every screen, every component, every pixel — what the app looks like and what's in it.

---

## Design System Foundations

### Color Palette

| Role | Light Mode | Dark Mode |
|------|-----------|-----------|
| Primary accent | `#7c3aed` (purple) | `#7c3aed` |
| Primary darker | `#6d28d9` | `#6d28d9` |
| Background | `#ffffff` | `#08080f` |
| Surface (cards) | `#f9fafb` | `#1a1a2e` |
| Text primary | `#111111` | `rgba(255,255,255,0.92)` |
| Text secondary | `#6b7280` | `rgba(255,255,255,0.6)` |
| Text tertiary | `#9ca3af` | `rgba(255,255,255,0.4)` |
| Border light | `#efefef` | `rgba(255,255,255,0.07)` |
| Streak / energy | `#f97316` (orange) | same |
| Completion | `#22c55e` (green) | same |
| Progress / info | `#0ea5e9` (blue) | same |
| Error / danger | `#dc2626` (red) | same |

> **Rule**: Onboarding = light background, dark text. Dashboard = dark background, light text.

### Typography

| Size label | px value | Weight | Use |
|-----------|---------|--------|-----|
| xs | 10–12px | 300–400 | Labels, timestamps, tags |
| sm | 13–14px | 400–500 | Body copy, descriptions |
| base | 14–16px | 400–600 | Standard UI text |
| lg | 18px | 500–600 | Section headings |
| xl | 20–22px | 600–700 | Card titles |
| 2xl | 24–28px | 700 | Page headings |
| clamp | `clamp(17px, 4.5vw, 20px)` | 600 | Mobile-responsive headings |

Letter spacing: `-0.03em` headings, `-0.01em` subheads, `0.04–0.08em` uppercase labels.

### Spacing Scale

`4 → 8 → 12 → 16 → 24 → 32 → 48 → 64px` (xs → sm → md → lg → xl → 2xl → 3xl → 4xl)

### Border Radius

`6 → 8 → 12 → 14 → 16 → 20 → 24px` (sm → md → lg → → xl → → 2xl)

### Shadows

- Cards: `0 4px 16px rgba(0,0,0,0.08)`
- Hero cards: `0 20px 60px rgba(124,58,237,0.35), 0 0 0 1px rgba(167,139,250,0.2)`
- Bottom sheet: `0 -8px 40px rgba(0,0,0,0.18)`
- Buttons (purple): `0 4px 14px rgba(124,58,237,0.3)`

### Transitions

- Fast interactions: `150ms ease`
- Standard: `200–300ms ease`
- Sidebar: `500ms cubic-bezier(0.23, 1, 0.32, 1)`
- Spring (modals): `type: spring, damping: 28, stiffness: 320`

---

## Responsive Breakpoints

| Name | Width | Device |
|------|-------|--------|
| xs | 375px | iPhone SE |
| sm | 390px | iPhone standard |
| md | 768px | iPad / tablet cutoff |
| lg | 1024px | Desktop |
| xl | 1280px | Wide desktop |

`isMobile` = `window.matchMedia('(max-width: 767px)')` — controls sidebar vs bottom nav.

---

## Page 1: Landing Page

**File**: `src/features/onboarding/components/LandingPage.tsx`
**Theme**: Light background, dark text
**Layout**: Full viewport, vertically scrollable sections

### Sticky Navbar (top, fixed)
- Height: ~56px
- Background: white with blur
- Left: Coheren logo + "coheren.ai" wordmark
- Right: nav links (How it works, About, Testimonials) + purple "Get Started" CTA button
- Mobile: hamburger icon → slide-down menu

### Hero Section
- Full-viewport height
- Background: light gradient + animated particles
- Center-aligned text:
  - Large headline (clamp, ~36–52px, bold)
  - Subheadline (18px, secondary color)
- Goal input field below headline:
  - Large, rounded input card
  - Placeholder: "I want to learn Python in 3 months"
  - Animated tag extraction shows Intent / Domain / Timeline tags on submit
  - Purple "Get Started →" button below
- Scroll-down indicator (chevron animation)

### How It Works Section
- Sticky scroll layout (desktop): text left, animated visual right
- Mobile: stacked vertically
- Steps: shadow extraction → agent pipeline → daily tasks → recalibration
- Each step: number badge, bold heading, description paragraph

### Features Section
- 3-column card grid (desktop), 1-column (mobile)
- Agent icons with colored backgrounds
- Cards: white bg, border, border-radius 16px, hover lift

### Testimonials
- Carousel (swipeable on mobile)
- Stars, quote text, user name
- Gray background band

### Pricing
- 3 tiers: Free / Pro / Team
- Cards: white bg, highlighted tier has purple gradient border + "Most Popular" badge
- Feature checklist rows
- CTA button per tier

### Footer
- Minimal: logo, links, copyright

---

## Page 2: Chat Onboarding

**File**: `src/features/onboarding/components/ChatOnboarding.tsx`
**Theme**: Light
**Layout**: Centered column, max-width ~520px, full-height viewport

### Header
- Top-left: Coheren logo (purple, 22px icon)
- "Think less. Do more." tagline (10px, gray)
- Progress step counter (e.g., "Step 2 of 4")

### Phase 1 — Brain Dump (initial chat)
- Greeting message bubble (AI, left-aligned, gray bubble)
- User reply bubbles (right-aligned, purple bg, white text)
- Input bar at bottom:
  - Text area, rounded, white bg, border
  - Send button (purple gradient, arrow icon)
  - Safe-area-inset-bottom padding (mobile)
- On submit → animated tag pills appear: "Intent: Learn boxing", "Timeline: 3 months", "Daily: 1 hour"

### Phase 2 — Analyzing Transition
- Full-screen overlay fade
- CoherenLoader (custom shader animation, pulsing dots)
- Text cycles through: "Analyzing your responses..." → "Building your profile..." → "Personalizing your journey..."
- Duration: ~2 seconds before moving on

### Phase 3 — Stone Questions
- Replaced by full StoneQuestions component (see below)

### Phase 4 — Generating Curriculum
- Loading UI similar to Phase 2
- Progress messages: "Building your roadmap..." → "Generating your first week..." → "Almost ready..."

### Error States
- Red alert box below the input (border, bg rgba(220,38,38,0.06))
- "Retry" button (small, outline style)

---

## Page 3: Stone Questions

**File**: `src/features/onboarding/components/StoneQuestions.tsx`
**Theme**: Light
**Layout**: Centered card, max-width 520px

### Progress Bar (top, outside card)
- Row of N segments (one per question)
- Each segment: 4px tall, rounded, gap 4px
  - Completed: gradient `#7c3aed → #a78bfa` (100% fill)
  - Current: same gradient (50% fill)
  - Upcoming: `#e5e7eb` (empty)
- "Question X of Y" counter below (12px, gray)

### Question Card
- White background
- Border-radius: 24px
- Box-shadow: `0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)`
- Padding: 32px 28px
- Min-height: 320px
- AnimatePresence slide transitions between questions (x: ±60px)

**Question text**
- Font: `clamp(17px, 4.5vw, 20px)` / weight 600 / color `#1a1a2e`
- Letter-spacing: -0.02em

**Reasoning** (optional, shows why question is asked)
- Font: 13px / color `#9ca3af`

### Answer Types

**Multiple Choice** (radio options)

Each option button:
- Display: flex row, gap 12px, padding 14px 16px
- Border-radius: 14px
- Unselected: border `2px solid #f3f4f6`, bg `#fafafa`
- Selected: border `2px solid #7c3aed`, bg `rgba(124,58,237,0.04)`
- Hover (unselected): border → `#c4b5fd`, bg → `rgba(124,58,237,0.02)`
- Radio circle: 20px, border 2px → filled 6px inner dot on select
- Text: 14px, weight 500, `#374151`
- Stagger animation: each option delays 0.06s × index

**Yes / No**

Grid 2 columns, gap 10px:
- Button: padding 16px 20px, border-radius 14px, font 15px weight 600
- Unselected: border `#f3f4f6`, bg `#fafafa`, color `#374151`
- Selected: border `#7c3aed`, bg `rgba(124,58,237,0.04)`, color `#7c3aed`

**Scale (1–5)**

Row of 5 square buttons (48×48px each), centered:
- Border-radius: 12px
- Unselected: border `#f3f4f6`, bg `#fafafa`, color `#374151`
- Selected: border `#7c3aed`, bg `rgba(124,58,237,0.08)`, color `#7c3aed`, font-weight 700

Below: "Next →" button (appears when answered):
- Inline-flex, padding 12px 24px, border-radius 12px
- Gradient bg `#7c3aed → #a78bfa`, color white
- Box-shadow: `0 4px 14px rgba(124,58,237,0.3)`

**Open-Ended (textarea)**

- Width 100%, min-height 120px
- Border: `2px solid #f3f4f6`, border-radius 14px
- Background: `#fafafa`
- Focus: border → `#7c3aed`, bg → white
- Font: 14px, line-height 1.6
- Below: same "Next →" button

---

## Page 4: Dashboard Shell

**File**: `src/features/dashboard/index.tsx`
**Theme**: Dark

### Desktop Layout

```
┌──────────────────────────────────────────────┐
│  [Sidebar 260px fixed] │  [Content area]      │
│                        │  max-width ~800px    │
│                        │  centered            │
└──────────────────────────────────────────────┘
```

- When sidebar closed: toggle button appears top-left (40×40px, dark bg)
- Content shifts right with sidebar (margin-left: 0 or 260px, animated)

### Mobile Layout

```
┌───────────────────────────────┐
│  [Content area, full width]   │
│                               │
│  bottom padding = 96px        │
├───────────────────────────────┤
│  [Bottom Nav, fixed 56px]     │
└───────────────────────────────┘
```

### Background
- `#08080f` base
- Content container: padding 64px (desktop), 20px 16px (mobile)

### Sidebar Toggle Button (desktop, when sidebar closed)
- Position: fixed, top 16px, left 16px
- 40×40px, border-radius 8px
- Background: `#08080f`
- Border: `1px solid rgba(255,255,255,0.06)`
- Hover: border → `rgba(124,58,237,0.5)`, bg → `#0f0f1a`
- Menu icon (gray)

### Active Modals / Overlays (stacked on top)
1. **CheckpointScreen** — replaces content area entirely (step 14 days)
2. **DifficultyPrompt** — inline card at top of Today view
3. **NotificationCenter** — fixed modal, top-right (desktop) or bottom sheet (mobile)
4. **CoachThread** — fixed right-side panel or modal
5. **TaskFeedbackModal** — bottom sheet, z-index 1000+

---

## Sidebar

**File**: `src/features/dashboard/components/DashboardSidebar.tsx`
**Width**: 260px fixed
**Theme**: Very dark (`#08080f` / `#0d0d1a`)

### Header Section
- Padding: 16–24px
- Border-bottom: `1px solid rgba(255,255,255,0.06)`
- Left: Coheren logo icon (22px, `#7c3aed`) + wordmark text
  - "coheren.ai" (14px, weight 500, `rgba(255,255,255,0.92)`)
  - "Think less. Do more." (10px, weight 300, `rgba(255,255,255,0.25)`)
- Right: Close (×) button (28px, rgba white 30%)

### Navigation Items (full list)
Each item: full width, flex row, gap 12px, padding 10px 24px

| State | Border-left | Background | Text | Icon |
|-------|------------|-----------|------|------|
| Inactive | 2px transparent | transparent | rgba(255,255,255,0.4) weight 300 | rgba(255,255,255,0.4) |
| Hover | 2px transparent | rgba(255,255,255,0.05) | slightly brighter | — |
| Active | 2px `#7c3aed` | rgba(124,58,237,0.12) | `#c4b5fd` weight 500 | `#c4b5fd` with glow |

Active inset shadow: `inset 0 0 28px rgba(124,58,237,0.07)`
Hover transform: `translateX(3px)`, transition 180ms

**Nav items**:
1. Today (Home icon)
2. Journey (Map icon)
3. Progress (BarChart2 icon)
4. Library (BookMarked icon)
5. You (User icon)

**Separator** + **Coach** item (MessageCircle icon)

### Footer
- Border-top: `1px solid rgba(255,255,255,0.06)`
- Padding: 16–24px

**User identity row**:
- Bg: `rgba(124,58,237,0.07)`
- Border: `1px solid rgba(124,58,237,0.15)`
- Border-radius: 8px, padding 8px 12px
- Left: 32px avatar circle (gradient `#7c3aed → #a78bfa`, initials, weight 700, white)
- Right: Name (14px 500 weight) + Goal text (10px 300 `rgba(167,139,250,0.55)`)

**Level badge**:
- "LEVEL" label (11px, uppercase, tracking 0.04em, `rgba(255,255,255,0.3)`)
- Level name (11px, 500, colored per tier)
- Progress bar: 3px tall, `rgba(255,255,255,0.06)` track → colored fill with glow
- Below: "X / Y pts" or level tagline (10px, `rgba(255,255,255,0.18)`)

---

## Bottom Nav (Mobile Only)

**File**: `src/features/dashboard/components/BottomNav.tsx`
**Position**: Fixed bottom, full width

### Container
- Height: 56px + `env(safe-area-inset-bottom)`
- Background: `linear-gradient(180deg, rgba(8,8,15,0.95), rgba(8,8,15,1))`
- Border-top: `1px solid rgba(255,255,255,0.07)`
- Backdrop-filter: `blur(16px)`
- Box-shadow: `0 -4px 24px rgba(0,0,0,0.25)`

### Each Tab (5 equal-flex items)
- 56px height, flex column center, gap 3px

**Active state**:
- Top bar: 28×2px, border-radius 0 0 3px 3px, bg `#7c3aed`, glow shadow
- Icon: 20px, stroke 2, color `#7c3aed`
- Label: 10px, weight 600, `#7c3aed`, tracking 0.02em

**Inactive state**:
- No top bar
- Icon: 20px, stroke 1.5, `rgba(255,255,255,0.35)`
- Label: 10px, weight 400, `rgba(255,255,255,0.35)`

**Tabs**: Today / Journey / Library / Progress / You

---

## Today View — Full Detail

**File**: `src/features/dashboard/views/TodayView.tsx`
**This is the most important screen.**

### Layout
Vertical flex, scrollable. Width: 100%. Bottom padding: `calc(96px + safe-area)` on mobile.

---

### Section 1: Today Header

Flex row, space-between, align-center. Padding-bottom 24px.

**Left side**:
- "Day X" in large text (xl, weight 700, white)
- Date string below (sm, secondary color)

**Right side**:
- Streak badge: flame icon (`#f97316`) + "Xd" text
- Completion rate pill: checkmark + "X%" text

---

### Section 2: Smart Banner Slot

Contextual card that adapts:

| Situation | Content |
|-----------|---------|
| Day 1 | Welcome message |
| Post-checkpoint | "Curriculum adjusted" badge |
| 7-day streak | Celebration card |
| Day 13 / 27 | "Checkpoint tomorrow" warning card |
| Nothing notable | Hidden (no banner) |

Card style: border-left 3px colored, bg light tint, padding 12px 16px, border-radius 12px.

---

### Section 3: Focus Card (main task card)

The main task card — the most used UI in the whole app.

**Outer container**:
- Background: tokens.colors.surface (dark: `#1a1a2e`)
- Border: `1px solid rgba(255,255,255,0.07)`
- Border-radius: 20px
- Padding: 24px
- Box-shadow: `0 4px 24px rgba(0,0,0,0.15)`

**Top row** (task type + duration):
- Task type pill: `PRACTICE` / `LEARNING` / `REFLECTION` (10px, uppercase, colored bg, pill shape)
- Duration pill: clock icon + "X min" (sm, secondary)
- Right: Cinema Mode button (if video resource exists)
  - Video icon + "Cinema" label
  - Border: `1px solid rgba(255,255,255,0.1)`, hover → purple

**Task title**:
- Font: 20px, weight 700, white
- Letter-spacing: -0.02em

**Description**:
- Font: 14px, line-height 1.6, secondary color
- Margin-top: 8px

**"Why This Matters" expandable section**:
- Collapsed: single line + "more" link
- Expanded: full paragraph + "Why it matters:" label (purple)
- Toggle with chevron icon

---

**Steps Section**

Header: "Steps" label (11px, uppercase, gray) + "X min" total

Each step (flex row, gap 12px):
- Left: step number circle (22px, `rgba(124,58,237,0.15)`, `#a78bfa` text, weight 700)
- Content:
  - Instruction text (14px, primary color, line-height 1.5)
  - Duration (11px, `rgba(124,58,237,0.7)`)
  - Optional note (12px, secondary color, top-margin)
- Right: check circle (grays out on completion)

Spacing: 16px between steps, 12px vertical padding each

---

**Tips Section** (if tips exist)

Collapsed by default, expandable:
- "Tips" label (11px, uppercase, gray) + chevron
- Each tip: bullet point, 13px, secondary color, left-padding 12px

---

**Success Criteria Section**

- "Done when:" label (11px, uppercase, `rgba(124,58,237,0.7)`)
- Primary criteria: 14px, primary color
- Optional secondary criteria: 13px, secondary color

---

**Resource Card** (if resource exists)

Compact card below success criteria:
- Display: flex row, gap 12px, align-center
- Padding: 12px 14px
- Background: `rgba(239,68,68,0.06)` (videos) or type-specific
- Border: `1px solid rgba(239,68,68,0.12)`
- Border-radius: 12px

  - Thumbnail (36×36): YouTube thumbnail or type icon
  - Text: title (13px, 500) + channel (11px, gray) + duration pill
  - Right: play button or external link icon

---

**Action Row** (bottom of card)

Three buttons, flex row:

1. **Skip** button:
   - Ghost style, "Skip" text (13px), right-aligned
   - Color: secondary gray
   - Click → opens skip reason picker (bottom sheet)

2. **Mark Done** button (primary):
   - Full width, gradient bg `#7c3aed → #a78bfa`
   - Height 48px, border-radius 14px
   - "Mark as Done" text (15px, weight 600, white)
   - Arrow icon right
   - Box-shadow: `0 4px 14px rgba(124,58,237,0.35)`
   - On click → triggers TaskFeedbackModal

3. **Cinema Mode** (only if video resource):
   - Icon-only or icon + "Watch" label
   - Expands cinema panel

---

### Section 4: Cinema Mode

Full-screen overlay when activated.

**Overlay**:
- Position: fixed, inset 0, z-index 1001
- Background: `rgba(0,0,0,0.95)`
- On mobile: absolute + full viewport

**Close button**:
- Top-right, 36×36px, circle, `rgba(255,255,255,0.1)` bg
- X icon, white

**Layout** (desktop: side-by-side, mobile: stacked):

Left/top panel — YouTube iframe:
- Aspect ratio 16:9
- Rounded 12px corners
- Border: `1px solid rgba(255,255,255,0.06)`
- Loaded from `watchFrom` timestamp automatically

Right/bottom panel — Step checklist:
- White bg on mobile (overlay bottom sheet)
- Dark bg on desktop
- Step list with checkboxes
- Timer: counts up from 0:00
- "Complete Session" button at bottom

---

### Section 5: All Done Card

Shows when all today's tasks are completed.

**Card**:
- Background: dark gradient purple
- Border-radius: 20px, padding: 32px 24px
- Confetti particle burst on mount (canvas overlay)

**Content**:
- Celebration emoji + "Day X Complete!" heading
- "X-day streak" with flame icon
- Motivational message (from coach messages hook)
- "See you tomorrow" CTA button

---

### Section 6: Rest Day Card

Shows on every 7th day (configured rest days).

**Card**:
- Lighter bg, dashed border (or solid)
- Moon/coffee icon
- "Rest Day" heading
- Recovery message + reflection prompt
- Optional: "Light task" button (generates a 5-min reflection)

---

### Assessment Card (task type = assessment)

**File**: `src/features/dashboard/components/AssessmentCard.tsx`

Shown in place of steps for assessment tasks:
- Question text (large, centered)
- Multiple choice or yes/no options (same style as StoneQuestions)
- Progress: "Q X of Y"
- "Submit" button after last question

---

## Task Feedback Modal

**File**: `src/features/dashboard/components/TaskFeedbackModal.tsx`

Bottom sheet modal, appears after "Mark Done" press.

### Overlay
- Fixed, inset 0, z-index 1000
- `rgba(0,0,0,0.45)`, blur 4px
- Flex, align-items: flex-end, justify-center

### Sheet (motion.div)
- Max-width: 480px, width 100%
- Background: surface color (white or dark)
- Border-radius: 24px 24px 0 0
- Padding: 28px 24px + safe-area-inset-bottom
- Box-shadow: `0 -8px 40px rgba(0,0,0,0.18)`
- Spring animation: y 60 → 0, duration ~300ms

### Drag Handle
- 36×4px gray pill, centered, margin-bottom 24px

### Header
- "How did that feel?" (18px, weight 700)
- Task title below (13px, secondary gray)

### Mood Selector (5 emoji buttons)
Flex row, space-between:
- 😫 Hard (1) → 😕 (2) → 😐 Ok (3) → 🙂 (4) → 🤩 Easy (5)
- Each: flex 1, padding 10px 4px
- Unselected: transparent
- Selected: bg `rgba(124,58,237,0.08)`, border `2px solid #7c3aed`, border-radius 14px
- Emoji font-size: 28px

### Optional Note
- Label: "Anything to note? (optional)" (13px, gray)
- Textarea: 2 rows, padding 10px 12px, rounded 12px, border `#e5e7eb`
- Resize: none

### Done Button
- Full width, height 48px, rounded 14px
- Enabled (mood selected): gradient `#7c3aed → #a78bfa`, white text, shadow
- Disabled: `#e5e7eb` bg, `#9ca3af` text

### Streak Footer
- Centered, 12px gray: "5-day streak 🔥"

---

## Journey View

**File**: `src/features/dashboard/views/JourneyView.tsx`
**Theme**: Dark

### Header Row
- "Journey" title (xl, white, weight 700)
- Total weeks badge (pill, purple bg)
- Current week badge

### Hero Progress Card
- Background: `linear-gradient(135deg, #1e0a3c → #2d1060 → #1a0a2e)`
- Border-radius: 20px, padding: 32px
- Box-shadow: `0 20px 60px rgba(124,58,237,0.35)`
- Radial glow: top-right corner, `rgba(167,139,250,0.12)`

Contents:
- "JOURNEY" label (11px, uppercase, `rgba(196,181,253,0.55)`)
- Roadmap title (xl, `#f3e8ff`, weight 700)
- Progress "X%" (right-aligned, `#c4b5fd`)
- Progress bar: 8px, gradient fill, glow shadow
- Stats grid 3 columns: Day X / Week Y of Z / W weeks left

### Phase Map
- Horizontal row of phase bars
- Each: width proportional to duration
- Completed: dark fill, Active: purple fill, Upcoming: outline only
- Phase name + % below each bar

### By Month Breakdown
Collapsible sections per month:
- Header: calendar icon + "Month Year" + weeks range + "Active"/"Done" badge
- Expanded: list of WeekCards

### Week Card
Collapsible:
- Header: "Week X — [focus title]" + completion count + chevron
- Day dots row: 7 mini circles (7px), colored by status:
  - Completed: green fill
  - Skipped: orange fill
  - Today: blue outline
  - Future: gray outline
  - Rest: empty gray
- Expanded: full task list for that week
  - Each task row: checkbox + title + duration + mood badge

### Upcoming Preview
- Dashed border card below current week
- "Up next · Week X"
- Task type count pills (Practice ×3, Learning ×2, etc.)

---

## Progress View

**File**: `src/features/dashboard/views/ProgressView.tsx`
**Theme**: Dark

### Stats Strip (4-column grid)
Thin horizontal row of stats:
- **Streak**: flame icon (`#f97316`), "Xd"
- **Overall**: TrendingUp icon (`#7c3aed`), "X%"
- **This Week**: Calendar icon (`#0ea5e9`), "X%"
- **Day**: CheckCircle icon (`#7c3aed`), "X"
Each: padding 10px, border-right divider, center-aligned

### 28-Day Heatmap Calendar
- 4 rows × 7 columns grid
- Each cell: 8×8px rounded square
- Colors: green (done) / yellow (partial) / red (missed) / light gray (rest) / blue outline (today)
- Legend row below

### Two-Column Section (desktop only)
| Left | Right |
|------|-------|
| TrendSparkline (weekly completion line chart) | PersonalRecords (longest streak, best week, total mins) |

### AI Coach Summary
- Brain icon + "Coach says" label
- Card: bg light purple tint, left border `#7c3aed`
- Coach message text (14px, line-height 1.6)

### Journey Context (2-column card)
- Left: "Current Focus" — phase name + description
- Right: "Next Checkpoint" — days remaining
- Border: `1px solid rgba(124,58,237,0.12)`

### Activity Breakdown
- 3 rows: Practice / Learning / Reflection
- Each: label + horizontal progress bar + count
- Colors: purple / blue / purple-light

### Week by Week
- Vertical list, each week:
  - "Week X" + completion bar + "%"
  - Current week: gradient bg + glow
  - Future weeks: gray outline

---

## Library View

**File**: `src/features/dashboard/views/LibraryView.tsx`
**Theme**: Dark

### Header
- "Library" title + resource count badge
- "Curated for your [domain] journey" subtitle

### Search Bar
- Flex row: search icon + input + optional clear ×
- Background: `#f9fafb` or dark equivalent
- Border: `1px solid #efefef`, border-radius 12px
- Input: no border, transparent bg

### Empty State
- BookOpen icon (36px, gray)
- "No resources yet"
- "Resources appear as you progress" (subtitle)
- Background: dashed border card

### "For You Today" Section
- Sparkles icon + label
- Last 3 days' task resources surfaced here

### Resource Sections (by type, collapsible)

Section header:
- Type icon (28px, colored circle) + type name + count badge + chevron

**Resource Row** (per item):
- Flex row, gap 12px, padding 8px 0, border-bottom
- Left: 40×40 thumbnail
  - Video: YouTube thumbnail + red play overlay
  - Article: blue document icon
  - Tool: amber tool icon
  - Practice: green activity icon
- Center: title (13px, 500) + channel (11px, gray) + duration pill
- Right: chevron (expands details)

**Expanded details** (motion.div, height auto):
- Description (13px, line-height 1.6)
- "Why this helps:" box (purple bg, 10px label, 12px text)
- "Open on YouTube" button (gradient, icon + label)

### Type Color Coding
| Type | Icon bg | Border |
|------|---------|--------|
| Video | `rgba(239,68,68,0.10)` | red |
| Article | `rgba(59,130,246,0.10)` | blue |
| Tool | `rgba(245,158,11,0.10)` | amber |
| Practice | `rgba(34,197,94,0.10)` | green |

---

## Insights View

**File**: `src/features/dashboard/views/InsightsView.tsx`
**Theme**: Dark

### Momentum Strip (horizontal scroll on mobile)
4 stat cards side-by-side:
1. **Completion** — "X%" — "Up from Y% last week"
2. **Streak** — "Xd" — "Your longest yet" or "Beat your record!"
3. **Hours** — "Xh" — "~Yh to goal"
4. **Progress** — "Week X of Y" — "Z% this week"

Each card:
- Min-width: 140px (mobile)
- Gradient bg (light tint matching color)
- Colored border
- Icon (20px) + label (9px uppercase)
- Large value (26px, weight 700)
- Context sentence (11px, gray)

### 28-Day Activity Calendar
Same as Progress View

### Two-Column Section (desktop)
| Left: Weekly Trend Chart | Right: Personal Records |

### AI Observations
- Brain icon + "Observations" label
- Coach message card (same style as Progress View)

### Deep Insights Grid (2×2 on desktop, 1-col mobile)
4 metric cards:

1. **ConsistencyScore** — SVG ring chart
   - Ring fill = "X% of days you showed up"
   - Center: large %, label below
   - Rating: Excellent / Good / Building

2. **TaskTypeBreakdown** — Stacked bar
   - Horizontal bar: practice (purple) / learning (blue) / reflection (lighter)
   - Legend + completion rates

3. **DifficultyTrend** — SVG line chart
   - X: weeks, Y: avg difficulty (1–5)
   - Trend indicator: ↑ "Getting harder" / ↓ "Easing up" / → "Stable"

4. **SkipPatterns** — Ranked list
   - "Why you skipped" ranked by frequency
   - Reasons: Time / Health / Difficulty / External
   - Animated progress bars

### Task History (collapsible section)
- Toggle button at bottom (border-top separator)
- Expanded: list of last 30 completed tasks
  - CheckCircle icon, title, day number, type pill

---

## Goals View

**File**: `src/features/dashboard/views/GoalsView.tsx`
**Theme**: Dark

### Hero Goal Card (same dark gradient)
- Target icon (40px, `#c4b5fd`)
- Goal title (xl, `#f3e8ff`)
- Target date (right-aligned)
- Progress bar
- 3-column stats: Duration / Day / Daily time

### Behavioral Profile Section
- "Your Behavioral Profile" heading
- "Identified during onboarding" subtitle

**Archetype Card**:
- Gradient bg `rgba(124,58,237,0.06)`
- Border: `1px solid rgba(124,58,237,0.16)`
- Layers icon + archetype name (base size, weight 600)

**Friction Points List**:
Up to 4 stones shown:
- Color dot (severity color) + stone name + severity pill + trigger text
- Primary stone gets a "Primary" badge

### Phases Section
Vertical list of phase cards:

| State | Left border | Bg | Opacity |
|-------|------------|-----|---------|
| Active | 4px `#7c3aed` | `rgba(124,58,237,0.03)` | 1.0 |
| Completed | 4px `#6d28d9` | lighter | 0.8 |
| Upcoming | 4px gray | transparent | 0.6 |

Each card:
- Phase icon circle (36px, gradient fill if active/done, gray if upcoming)
- Phase number + name + weeks range
- Description text (sm, secondary)
- "Current Phase" badge on active

---

## You View

**File**: `src/features/dashboard/views/YouView.tsx`
**Theme**: Dark + light mix

### Identity Hero Card
- Dark gradient background
- 60px avatar circle (gradient, white initials, 700 weight)
- Name (clamp 17px–22px, weight 700)
- "Day X of your [goal] journey" subtitle
- Streak context: "5-day streak 🔥" or "Start your streak"

### Tab Bar
- 2 tabs: "You" and "Settings"
- Active: gradient pill bg + white text
- Inactive: transparent + gray text
- Border-radius: 10px, padding: 8px 16px

---

### YOU Tab

**Your Setup** (horizontal scroll row):
5 mini cards showing:
- Goal name / Daily time / Focus time (morning/afternoon/evening) / Wake-up time / Weekends
- Each: 110px min-width, 12px padding, `#f9fafb` bg (or dark equivalent), small label + value

**Your Patterns**:
- Brain icon heading
- List of detected stone patterns
- Each row: `#f9fafb` bg, left border `#ede9fe`
  - "You have [pattern name]"
  - "→ [What the app does about it]"

**Commitment Card**:
- Purple gradient bg
- Italic quote of the goal title

---

### SETTINGS Tab

**Quick Edit Cards** (2-column responsive grid):
- Name, Check-in Time, Energy Pattern, Daily Commitment, Notifications
- Each card:
  - Icon + label (caption)
  - Large value OR editable input
  - "click to edit" subtitle (sm, gray)
  - Hover: `translateY(-2px)`, border → primary

**Profile Details** (2-column, read-only):
- Wake Time / Weekend Availability

**Danger Zone**:
- Trash2 icon (22px, red) + "Danger Zone" heading (red)
- Warning text
- "Reset All Progress" button (outline red)
- Confirmation prompt: "Are you sure? Type DELETE to confirm"

---

## Checkpoint Screen

**File**: `src/features/dashboard/components/CheckpointScreen.tsx`
**Appears**: Every 14 days, replaces content area

### Header
- "Sprint X Complete" badge (Sparkles icon, gradient bg)
- "Days W–X done." heading (clamp 22–28px)
- "Here's what happened, and what's next." subtitle

### Stats Summary Card
- Background: surface
- Border: 1px border
- "HERE'S WHAT HAPPENED" label (11px uppercase)
- 4 bullet points:
  - "X of Y tasks completed (Z%)"
  - "Strongest area: [topic]"
  - "Needs more practice: [area]"
  - "Sprint X difficulty: [label]"

### Coach Message Card (if plan was adjusted)
- Background: `#f5f3ff`, border `1px rgba(124,58,237,0.15)`
- "WHAT I'M CHANGING" label (Sparkles icon)
- Recalibration message (14px)

### Quick Check-In Form

**Confidence Slider**:
- Label: "Confidence with skills learned" + "X/10" value
- `<input type="range" min=1 max=10>`
- Gradient track (dynamic color by value: red at 1–3, yellow 4–6, green 7–10)
- "Still learning" / "Fully mastered" end labels

**Time Management Buttons**:
- 4 options: "Not enough" / "Tight" / "Fine" / "Plenty"
- Grid 2-col (mobile), 4-col (desktop)
- Unselected: 1px border, transparent
- Selected: 2px `#7c3aed` border, `rgba(124,58,237,0.08)` bg, purple text

**Optional Notes Textarea**:
- 2 rows, "Anything for your AI to know?"
- Rounded 10px, padding 10px 12px

### Continue Button
- Full width, height 50px, rounded 14px
- Gradient (active) or gray (loading)
- Spinner or ArrowRight icon
- Text: "Continue to Sprint X+1"

---

## Notification Center

**File**: `src/features/dashboard/components/NotificationCenter.tsx`

### Desktop: top-right slide-in
- Position: fixed, top ~60px, right 16px
- Max-width: 360px
- Border-radius: 16px

### Mobile: bottom sheet
- Border-radius: 20px 20px 0 0
- Width: 100%

### Common styles
- Max-height: 70vh, overflow-y auto
- Background: surface
- Border: 1px borderLight
- Box-shadow: `0 16px 48px rgba(0,0,0,0.2)`
- Slide-in animation: `opacity 0→1, translateY -8→0, scale 0.98→1` (0.18s ease)

### Header
- "Updates" title + × close button
- Border-bottom

### Notification Row
- Padding 12px / 24px
- Border-top on all except first
- Unread: `rgba(124,58,237,0.03)` bg tint

  - Emoji icon (18px, type-based: 🔧 🏆 📊 💡 ⚙️)
  - Content: title (sm, 500) + body text (xs, secondary) + timestamp (10px, tertiary)
  - Unread dot: 6px purple circle, right side

### Empty State
- Bell icon (28px, gray) + "No updates yet" (sm, gray)

---

## Animation Reference

### Global Keyframes
```css
dashFadeIn: opacity 0 → 1, duration 0.18s ease
spin: rotate 0 → 360°, infinite
journey-pulse: box-shadow breathing pulse, 2s ease infinite
notif-slide-in: opacity 0→1, translateY -8→0, scale 0.98→1, 0.18s ease
journey-shimmer: gradient shimmer left to right
```

### Framer Motion Patterns

**Stagger list items**:
```
initial: { opacity: 0, y: 8 }
animate: { opacity: 1, y: 0 }
transition: { delay: index * 0.06, duration: 0.25 }
```

**Slide between questions (StoneQuestions)**:
```
enter: { x: direction > 0 ? 60 : -60, opacity: 0 }
center: { x: 0, opacity: 1 }
exit: { x: direction > 0 ? -60 : 60, opacity: 0 }
transition: duration 0.3, ease [0.22, 1, 0.36, 1]
```

**Bottom sheet entrance**:
```
initial: { y: 60, opacity: 0 }
animate: { y: 0, opacity: 1 }
transition: { type: 'spring', damping: 28, stiffness: 320 }
```

**Page fade-in**:
```
initial: { opacity: 0, y: 16 }
animate: { opacity: 1, y: 0 }
transition: { duration: 0.3 }
```

**Collapsible section**:
```
initial: { height: 0, opacity: 0 }
animate: { height: 'auto', opacity: 1 }
exit: { height: 0, opacity: 0 }
transition: duration 0.2, ease [0.22, 1, 0.36, 1]
```

---

## Interaction Patterns

### Buttons
- Default: pointer, transitions `150ms ease`
- Gradient buttons: hover drop-shadow increase, slight scale (1.02)
- Disabled: gray bg (`#e5e7eb`), `not-allowed` cursor, no shadow

### Cards
- Hover: `translateY(-2px)`, border → primary `#7c3aed`
- Selected/active: border `2px solid #7c3aed`, bg `rgba(124,58,237,0.08)`
- Transition: `all 200ms ease`

### Inputs
- Focus: border-color → primary, box-shadow `0 0 0 3px rgba(124,58,237,0.1)`
- Placeholder: `#9ca3af`
- No outline

### Modals
- Backdrop: `rgba(0,0,0,0.45–0.5)`, blur 2–4px
- Click outside: closes
- Mobile: all modals are bottom sheets (safe-area aware)

### Haptics
- `navigator.vibrate(50)` on mood selection (where supported)
- Task completion: vibrate pattern `[30, 50, 30]`

---

## Screen Flow Map

```
Landing (light)
    ↓ "Get Started"
Chat Onboarding (light)
    ↓ shadow extractor parsing
Analyzing Transition (overlay)
    ↓ 2s delay
Stone Questions (light card)
    ↓ submit answers
Curriculum Generation (loading overlay)
    ↓ done
Dashboard — Today View (dark) ← default on login
    ├─ FocusCard → Cinema Mode → All Done
    ├─ Bottom Nav / Sidebar → Journey View
    ├─ Bottom Nav / Sidebar → Library View
    ├─ Bottom Nav / Sidebar → Progress View
    ├─ Bottom Nav / Sidebar → You View
    ├─ Sidebar → Goals View
    ├─ Sidebar → Insights View
    └─ Every 14 days → Checkpoint Screen (overlays Today)
```

---

*Written 2026-03-18. Based on full source code review of all component files.*
