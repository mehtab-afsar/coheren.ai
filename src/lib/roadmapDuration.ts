/**
 * `roadmap.duration` was historically unit-ambiguous: the onboarding path
 * (ChatOnboarding.tsx) stored it in months, while loading a roadmap from the DB
 * (App.tsx) stored it in days. Both write sites now store days consistently —
 * this is the single place every reader (Settings, InsightsView, RoadmapView,
 * useCheckpoint, useStore) goes through instead of reading `duration` raw, so
 * future unit changes only need to happen here.
 *
 * The magnitude-based months guess (<=24) remains as a backward-compatibility
 * fallback for roadmaps persisted before this fix (localStorage/DB rows that
 * still hold a raw month count) — do not remove it without a data migration.
 * Prefer an explicit day count when one is available (agentRoadmap totals are
 * always in days and unambiguous).
 */
export function resolveDurationDays(rawDuration: number | undefined, totalDaysOverride?: number): number {
  if (totalDaysOverride != null) return totalDaysOverride;
  const rawDur = rawDuration ?? 0;
  if (rawDur <= 0) return 365;
  return rawDur <= 24 ? rawDur * 30 : rawDur;
}
