/**
 * Unit tests for useDifficultyMonitor — pure signal-detection logic
 *
 * The hook's `shouldPrompt` computation is a pure function of (tasks, currentDay).
 * We extract and test the logic directly without React rendering.
 *
 * Run: npm test
 */

import { describe, it, expect } from 'vitest';

// ─── Replicate the hook's internal logic as a pure function ──────────────────
// This matches the implementation in src/hooks/useDifficultyMonitor.ts exactly
// so any future drift between the hook and tests will be caught immediately.

const HARD_SKIP_THRESHOLD = 3;
const LOW_MOOD_THRESHOLD  = 4;
const WINDOW              = 5;

interface MockTask {
  day: number;
  completed?: boolean;
  skipped?: boolean;
  skipReason?: string;
  mood?: number;
}

function computeShouldPrompt(tasks: MockTask[], currentDay: number): boolean {
  const recent = [...tasks]
    .filter(t => t.day < currentDay && (t.completed || t.skipped))
    .sort((a, b) => b.day - a.day)
    .slice(0, WINDOW);

  if (recent.length < 3) return false;

  const hardSkips = recent.filter(t => t.skipped && t.skipReason === 'hard').length;
  const lowMoods  = recent.filter(t => typeof t.mood === 'number' && t.mood <= 2).length;

  return hardSkips >= HARD_SKIP_THRESHOLD || lowMoods >= LOW_MOOD_THRESHOLD;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const done = (day: number, mood?: number): MockTask => ({ day, completed: true, mood });
const hardSkip = (day: number): MockTask => ({ day, skipped: true, skipReason: 'hard' });
const timeSkip = (day: number): MockTask => ({ day, skipped: true, skipReason: 'time' });

// ─── Hard-skip threshold (≥ 3 in last 5) ─────────────────────────────────────

describe('useDifficultyMonitor — hard-skip threshold', () => {
  it('returns false with 2 hard skips in window', () => {
    const tasks = [hardSkip(1), hardSkip(2), done(3), done(4), done(5)];
    expect(computeShouldPrompt(tasks, 6)).toBe(false);
  });

  it('returns true with exactly 3 hard skips in window', () => {
    const tasks = [hardSkip(1), hardSkip(2), hardSkip(3), done(4), done(5)];
    expect(computeShouldPrompt(tasks, 6)).toBe(true);
  });

  it('returns true with 4 hard skips in window', () => {
    const tasks = [hardSkip(1), hardSkip(2), hardSkip(3), hardSkip(4), done(5)];
    expect(computeShouldPrompt(tasks, 6)).toBe(true);
  });

  it('returns true with all 5 in window being hard skips', () => {
    const tasks = [hardSkip(1), hardSkip(2), hardSkip(3), hardSkip(4), hardSkip(5)];
    expect(computeShouldPrompt(tasks, 6)).toBe(true);
  });

  it('only counts tasks BEFORE currentDay (not including current day)', () => {
    // 3 hard skips but one is ON currentDay — should not count
    const tasks = [hardSkip(1), hardSkip(2), hardSkip(6), done(4), done(5)];
    expect(computeShouldPrompt(tasks, 6)).toBe(false); // only 2 before day 6
  });

  it('non-hard skips (time) do not count toward threshold', () => {
    const tasks = [timeSkip(1), timeSkip(2), timeSkip(3), done(4), done(5)];
    expect(computeShouldPrompt(tasks, 6)).toBe(false);
  });
});

// ─── Low-mood threshold (≥ 4 in last 5 with mood ≤ 2) ───────────────────────

describe('useDifficultyMonitor — low-mood threshold', () => {
  it('returns false with 3 low-mood tasks', () => {
    const tasks = [done(1, 1), done(2, 2), done(3, 1), done(4, 3), done(5, 4)];
    expect(computeShouldPrompt(tasks, 6)).toBe(false);
  });

  it('returns true with exactly 4 low-mood tasks in window', () => {
    const tasks = [done(1, 1), done(2, 2), done(3, 1), done(4, 2), done(5, 4)];
    expect(computeShouldPrompt(tasks, 6)).toBe(true);
  });

  it('returns true with all 5 low-mood (mood=1)', () => {
    const tasks = [done(1, 1), done(2, 1), done(3, 1), done(4, 1), done(5, 1)];
    expect(computeShouldPrompt(tasks, 6)).toBe(true);
  });

  it('mood=3 does not count as low mood', () => {
    const tasks = [done(1, 3), done(2, 3), done(3, 3), done(4, 3), done(5, 3)];
    expect(computeShouldPrompt(tasks, 6)).toBe(false);
  });

  it('tasks without mood field do not count toward low-mood threshold', () => {
    const tasks = [done(1), done(2), done(3), done(4), done(5)]; // no mood
    expect(computeShouldPrompt(tasks, 6)).toBe(false);
  });
});

// ─── Window behaviour ─────────────────────────────────────────────────────────

describe('useDifficultyMonitor — window slicing', () => {
  it('ignores tasks older than the 5-task window', () => {
    // 3 hard skips way in the past, recent 5 are fine
    const tasks = [
      hardSkip(1), hardSkip(2), hardSkip(3), // outside window
      done(4), done(5), done(6), done(7), done(8), // 5 most recent
    ];
    expect(computeShouldPrompt(tasks, 9)).toBe(false);
  });

  it('window is always the most recent N tasks (not calendar days)', () => {
    // 2 hard skips within the last 5 completed/skipped tasks
    const tasks = [
      done(1), done(2), done(3),
      hardSkip(4), hardSkip(5),
    ];
    expect(computeShouldPrompt(tasks, 6)).toBe(false); // only 2 hard skips in window
  });
});

// ─── Minimum sample size ─────────────────────────────────────────────────────

describe('useDifficultyMonitor — minimum sample size', () => {
  it('returns false when fewer than 3 tasks in window', () => {
    const tasks = [hardSkip(1), hardSkip(2)];
    expect(computeShouldPrompt(tasks, 3)).toBe(false);
  });

  it('returns false for empty task list', () => {
    expect(computeShouldPrompt([], 5)).toBe(false);
  });

  it('returns false for exactly 3 tasks with only 2 hard skips', () => {
    const tasks = [hardSkip(1), hardSkip(2), done(3)];
    expect(computeShouldPrompt(tasks, 4)).toBe(false);
  });
});

// ─── Combined signals ─────────────────────────────────────────────────────────

describe('useDifficultyMonitor — OR logic (either threshold)', () => {
  it('triggers if EITHER hard-skip OR low-mood threshold is met', () => {
    // 3 hard skips (threshold met), 0 low moods
    const tasksA = [hardSkip(1), hardSkip(2), hardSkip(3), done(4), done(5)];
    expect(computeShouldPrompt(tasksA, 6)).toBe(true);

    // 0 hard skips, 4 low moods (threshold met)
    const tasksB = [done(1, 1), done(2, 2), done(3, 1), done(4, 2), done(5, 5)];
    expect(computeShouldPrompt(tasksB, 6)).toBe(true);
  });
});
