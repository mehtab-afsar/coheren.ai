# Design System — current state & migration plan

This documents what's actually true today, not the aspiration. It exists
because the dashboard grew four parallel styling systems with no single
source of truth, and any contributor (or agent) touching UI code needs to
know which one to reach for and which ones are being phased out.

## The four systems, as they actually stand

| System | Where | Real adoption | Verdict |
|---|---|---|---|
| `tokens` (`src/core/design-system/tokens.ts`) | imported via the `@core/design-system` barrel | **Heaviest in the app** — 14 files, incl. 169 uses in `TodayView.tsx` and 142 in `ResourceCard.tsx` | Keep. Canonical for JS-computed styles until Phase 2 decides a winner. |
| `ap` (`src/core/design-system/appleTokens.ts`) | `@core/design-system/appleTokens` | 5 files (shell, `CoachThread`, `RoadmapView`, `TodayView`, `InsightsView`) | Keep for now — its palette values (e.g. `ap.bg` = `#F8F7F4`) do **not** match `--c-surface-bg` (`#ffffff`), so merging it into `--c-*` is a visual decision, not a mechanical rename. Deferred to Phase 2/3. |
| `--c-*` CSS custom properties | `src/index.css` `:root` | Broad but shallow — used directly in ~10+ dashboard files as `var(--c-*)` strings | Keep. Best long-term home for anything that doesn't need JS logic (hover/focus states, theming later). |
| Raw hex literals | scattered inline `style={{}}` | 33 of 38 dashboard files | **Drift, not a system.** This is what the lint rule below targets. |

**Correction for the record:** an earlier pass of this review claimed
`tokens.ts` had zero usages and recommended deleting it. That was wrong —
the check only looked for the direct import path
(`design-system/tokens'`) and missed the barrel re-export
(`@core/design-system`). It's actually the most-used system in the two
heaviest-styled files in the dashboard. Do not delete it without a real
migration plan; ripping it out would gut `TodayView.tsx` and
`ResourceCard.tsx`.

**Net effect:** don't add a fifth system. Any new UI code should reach for
`tokens.*` (matches the majority of existing dashboard code) or `--c-*`
(if it's a CSS-only concern like `:hover`/`:focus-visible`). Never write a
literal hex value.

## Component tiers (target state)

- **Tier 0 — primitives** (`src/shared/components/ui/`): Button, Card,
  Chip, Stat, IconButton, EmptyState, Modal. The *only* place a hex
  literal or a raw `<button>` should exist. A prior attempt at this
  (`primitives.tsx`) was built but never adopted (used by exactly 1 file)
  and has since been deleted as dead code — **don't rebuild it
  speculatively.** Rebuild each primitive in the same PR that migrates its
  first real caller, so nothing ships unused again.
- **Tier 1 — layout shell** (`src/shared/components/layout/`): domain-agnostic
  structural pieces. `PageContainer` (max-width/padding/fade-in) lives
  here now. Feature areas compose it — they don't reinvent it.
- **Tier 2 — feature composition** (`src/features/dashboard/**`): composes
  Tier 0 + Tier 1 only. `DashboardShell`
  (`src/features/dashboard/components/DashboardShell.tsx`) is the
  dashboard's Tier 1→2 bridge — sidebar/BottomNav/content-column
  structure, previously hand-duplicated once per render branch in
  `dashboard/index.tsx` (checkpoint screen vs. normal view), now owned in
  one place.

## Icons

Lucide (`lucide-react`) is already the utility icon language across the
app (nav, bell, settings, etc.) — keep it, but route it through a single
semantic map instead of importing ad hoc per file, so "progress" can't
silently become three different icons in three files:

```ts
// target: src/shared/components/ui/icons.ts (icons.tsx already exists — audit before adding)
export const ICONS = {
  progress: BarChart2,
  streak:   Flame,
  journey:  Map,
  // ...
} as const;
```

No emoji, anywhere, as icon substitutes. For emotional/brand moments
(achievements, empty states, streak milestones) that Lucide's utility
language isn't built for, a small curated custom line-art set (matching
the "clay" terracotta accent) is the target — exported from the same
module, not scattered per-component.

## Enforcement: the lint rule

`eslint.config.js` has a `no-restricted-syntax` block scoped to
`src/features/**/*.{ts,tsx}` that flags:

1. Raw hex color literals anywhere in the file (catches inline `style={{}}`
   regardless of nesting).
2. Raw `<button>` JSX elements.

It's set to **`warn`**, not `error` — as of this writing that surfaces
~605 warnings across the dashboard, which is the honest current size of
the drift, not something to block CI on mid-migration. As views get swept
in Phase 2/3, that count should trend to zero; once it hits zero, flip the
severity to `error` so it can't regress silently — including regressions
from other agents/contributors who haven't read this doc.

## Phased rollout

1. **Shell (done)** — `PageContainer`, `DashboardShell`, the lint rule.
   Zero changes to feature view internals; lowest risk of colliding with
   concurrent work elsewhere in the codebase.
2. **High-traffic views** — Today, Roadmap. Decide the `tokens` vs. `--c-*`
   question for real here, since these are the files with the deepest
   existing investment in `tokens.*`.
3. **Sweep the rest** — one view per PR, so concurrent work doesn't collide
   mid-file.
4. **Delete dead weight** — once nothing points at superseded paths.
   `tokens.ts` is explicitly *not* on this list until Phase 2 proves it
   out.

## Why this file exists

Multiple people/agents work on this repo concurrently. A convention that
only lives in someone's head (or one review conversation) doesn't survive
that. This file plus the lint rule are meant to survive it.
