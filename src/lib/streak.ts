/**
 * Streak computation with a "freeze" tolerance.
 *
 * The streak is the count of consecutive completed days ending today or yesterday.
 * A brittle streak (one missed day zeroes everything) is a textbook churn trigger,
 * so the streak tolerates a small number of single-day gaps — "freezes" — that keep
 * the streak alive across an off day. Freezes are EARNED from engagement (one per 7
 * completed days, capped) so they can't be farmed, and they never fabricate progress:
 * a frozen (missed) day preserves continuity but does NOT increment the streak count.
 */

const DAY_MS = 86_400_000;

export interface StreakResult {
  /** Consecutive completed days (frozen gap days are not counted). */
  streak: number;
  /** How many single-day gaps a freeze bridged in the current streak. */
  freezesUsed: number;
  /** Freezes still available after the current streak's usage. */
  freezesRemaining: number;
}

/** Freezes earned from total completed days: one per full week, capped at `cap`. */
export function earnedFreezes(totalCompletedDays: number, cap = 3): number {
  return Math.max(0, Math.min(cap, Math.floor(totalCompletedDays / 7)));
}

/**
 * Compute the current streak from a set of midnight-normalized completed-day
 * timestamps (ms). `todayMidnightMs` is today at 00:00. `freezeAllowance` is the
 * max number of single-day gaps that may be bridged (see earnedFreezes).
 */
export function computeStreak(
  completedDays: Set<number>,
  todayMidnightMs: number,
  freezeAllowance: number,
): StreakResult {
  if (completedDays.size === 0) {
    return { streak: 0, freezesUsed: 0, freezesRemaining: Math.max(0, freezeAllowance) };
  }

  const mostRecent = Math.max(...completedDays);
  const daysAgo = Math.floor((todayMidnightMs - mostRecent) / DAY_MS);
  // Streak is only "active" if the most recent completion is today or yesterday.
  if (daysAgo > 1) {
    return { streak: 0, freezesUsed: 0, freezesRemaining: Math.max(0, freezeAllowance) };
  }

  let streak = 0;
  let freezesUsed = 0;
  let checkDay = mostRecent;

  // Walk backwards from the most recent completion. A completed day extends the
  // streak; a missed day is bridged by a freeze only when the day before it was
  // completed (so a freeze covers exactly one isolated off day), and only while
  // freezes remain.
  while (true) {
    if (completedDays.has(checkDay)) {
      streak++;
      checkDay -= DAY_MS;
    } else if (freezesUsed < freezeAllowance && completedDays.has(checkDay - DAY_MS)) {
      freezesUsed++;
      checkDay -= DAY_MS; // skip the frozen off day; continue from the completed day before it
    } else {
      break;
    }
  }

  return { streak, freezesUsed, freezesRemaining: Math.max(0, freezeAllowance - freezesUsed) };
}
