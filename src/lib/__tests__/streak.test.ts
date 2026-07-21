import { describe, it, expect } from 'vitest';
import { computeStreak, earnedFreezes } from '../streak';

const DAY = 86_400_000;
// Fixed "today" at midnight (avoids Date.now in tests).
const TODAY = new Date('2026-03-15T00:00:00Z').getTime();
const daysAgo = (n: number) => TODAY - n * DAY;

// Build a completed-day set from day-offsets (0 = today, 1 = yesterday, ...).
const days = (...offsets: number[]) => new Set(offsets.map(daysAgo));

describe('earnedFreezes', () => {
  it('grants one freeze per full week, capped at 3', () => {
    expect(earnedFreezes(0)).toBe(0);
    expect(earnedFreezes(6)).toBe(0);
    expect(earnedFreezes(7)).toBe(1);
    expect(earnedFreezes(13)).toBe(1);
    expect(earnedFreezes(14)).toBe(2);
    expect(earnedFreezes(21)).toBe(3);
    expect(earnedFreezes(70)).toBe(3); // capped
  });
});

describe('computeStreak — basic (no freezes)', () => {
  it('returns 0 for empty history', () => {
    expect(computeStreak(new Set(), TODAY, 0).streak).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    expect(computeStreak(days(0, 1, 2, 3), TODAY, 0).streak).toBe(4);
  });

  it('stays active when the last completion was yesterday', () => {
    expect(computeStreak(days(1, 2, 3), TODAY, 0).streak).toBe(3);
  });

  it('is broken when the last completion was 2+ days ago', () => {
    expect(computeStreak(days(2, 3, 4), TODAY, 0).streak).toBe(0);
  });

  it('a single-day gap breaks the streak when no freezes are available', () => {
    // completed today, yesterday, then a gap at day 2, then day 3
    expect(computeStreak(days(0, 1, 3, 4), TODAY, 0).streak).toBe(2);
  });
});

describe('computeStreak — freeze tolerance', () => {
  it('bridges one single-day gap with a freeze (the churn fix)', () => {
    // days: 0,1 done, 2 missed, 3,4 done → with 1 freeze, streak spans 0..4 = 4 completed days
    const r = computeStreak(days(0, 1, 3, 4), TODAY, 1);
    expect(r.streak).toBe(4);
    expect(r.freezesUsed).toBe(1);
    expect(r.freezesRemaining).toBe(0);
  });

  it('does not count the frozen (missed) day toward the streak number', () => {
    // frozen day 2 preserves continuity but is not itself a completed day
    const r = computeStreak(days(0, 1, 3), TODAY, 1);
    expect(r.streak).toBe(3); // days 0,1,3 completed; day 2 frozen (not counted)
  });

  it('stops when freezes run out', () => {
    // two separate gaps (day 2 and day 5) but only 1 freeze
    const r = computeStreak(days(0, 1, 3, 4, 6), TODAY, 1);
    expect(r.freezesUsed).toBe(1);
    expect(r.streak).toBe(4); // 0,1,(freeze 2),3,4 then gap at 5 with no freeze left
  });

  it('bridges multiple gaps when enough freezes are available', () => {
    const r = computeStreak(days(0, 1, 3, 5), TODAY, 2);
    expect(r.freezesUsed).toBe(2);
    expect(r.streak).toBe(4); // 0,1,(f)3,(f)5
  });

  it('does not use a freeze on a two-day gap (freeze covers only one isolated day)', () => {
    // gap at days 2 AND 3 (two consecutive missed). Walking back hits day 2 and checks
    // its older neighbour day 3 — also missing — so no freeze is spent and the streak stops.
    const r = computeStreak(days(0, 1, 4, 5), TODAY, 2);
    expect(r.streak).toBe(2);
    expect(r.freezesUsed).toBe(0);
  });
});
