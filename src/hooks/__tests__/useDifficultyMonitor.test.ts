/**
 * Unit tests for useDifficultyMonitor's pure signal-detection logic.
 *
 * These import and exercise the REAL `computeDifficultySignal` from the hook
 * module — NOT a re-implemented copy — so any drift in the actual logic is
 * caught here. (A previous version of this file re-implemented the logic and
 * had silently drifted: it checked skipReason === 'hard' while the real hook
 * uses 'difficulty'.)
 *
 * Run: npm test
 */

import { describe, it, expect } from 'vitest';
import { computeDifficultySignal, type DifficultyTask } from '../useDifficultyMonitor';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const done = (day: number, mood?: number): DifficultyTask => ({ day, completed: true, mood });
const hardSkip = (day: number): DifficultyTask => ({ day, skipped: true, skipReason: 'difficulty' });
const timeSkip = (day: number): DifficultyTask => ({ day, skipped: true, skipReason: 'time' });

// Thin wrapper: test the `shouldPrompt` output with cooldowns cleared (not in cooldown)
// so we exercise the threshold logic, not the cooldown gate (covered separately below).
const shouldPrompt = (tasks: DifficultyTask[], currentDay: number): boolean =>
  computeDifficultySignal({
    tasks,
    currentDay,
    streak: 0,
    inPromptCooldown: false,
    inRecalCooldown: false,
    eventDriven: false,
  }).shouldPrompt;

// ─── Hard-skip threshold (≥ 3 in last 5) ─────────────────────────────────────

describe('computeDifficultySignal — hard-skip (difficulty) threshold', () => {
  it('returns false with 2 difficulty skips in window', () => {
    const tasks = [hardSkip(1), hardSkip(2), done(3), done(4), done(5)];
    expect(shouldPrompt(tasks, 6)).toBe(false);
  });

  it('returns true with exactly 3 difficulty skips in window', () => {
    const tasks = [hardSkip(1), hardSkip(2), hardSkip(3), done(4), done(5)];
    expect(shouldPrompt(tasks, 6)).toBe(true);
  });

  it('returns true with 4 difficulty skips in window', () => {
    const tasks = [hardSkip(1), hardSkip(2), hardSkip(3), hardSkip(4), done(5)];
    expect(shouldPrompt(tasks, 6)).toBe(true);
  });

  it('returns true with all 5 in window being difficulty skips', () => {
    const tasks = [hardSkip(1), hardSkip(2), hardSkip(3), hardSkip(4), hardSkip(5)];
    expect(shouldPrompt(tasks, 6)).toBe(true);
  });

  it('only counts tasks BEFORE currentDay (not including current day)', () => {
    // 3 difficulty skips but one is ON currentDay — should not count
    const tasks = [hardSkip(1), hardSkip(2), hardSkip(6), done(4), done(5)];
    expect(shouldPrompt(tasks, 6)).toBe(false); // only 2 before day 6
  });

  it('non-difficulty skips (time) do not count toward threshold', () => {
    const tasks = [timeSkip(1), timeSkip(2), timeSkip(3), done(4), done(5)];
    expect(shouldPrompt(tasks, 6)).toBe(false);
  });
});

// ─── Low-mood threshold (≥ 4 in last 5 with mood ≤ 2) ───────────────────────

describe('computeDifficultySignal — low-mood threshold', () => {
  it('returns false with 3 low-mood tasks', () => {
    const tasks = [done(1, 1), done(2, 2), done(3, 1), done(4, 3), done(5, 4)];
    expect(shouldPrompt(tasks, 6)).toBe(false);
  });

  it('returns true with exactly 4 low-mood tasks in window', () => {
    const tasks = [done(1, 1), done(2, 2), done(3, 1), done(4, 2), done(5, 4)];
    expect(shouldPrompt(tasks, 6)).toBe(true);
  });

  it('returns true with all 5 low-mood (mood=1)', () => {
    const tasks = [done(1, 1), done(2, 1), done(3, 1), done(4, 1), done(5, 1)];
    expect(shouldPrompt(tasks, 6)).toBe(true);
  });

  it('mood=3 does not count as low mood', () => {
    const tasks = [done(1, 3), done(2, 3), done(3, 3), done(4, 3), done(5, 3)];
    expect(shouldPrompt(tasks, 6)).toBe(false);
  });

  it('tasks without mood field do not count toward low-mood threshold', () => {
    const tasks = [done(1), done(2), done(3), done(4), done(5)]; // no mood
    expect(shouldPrompt(tasks, 6)).toBe(false);
  });
});

// ─── Window behaviour ─────────────────────────────────────────────────────────

describe('computeDifficultySignal — window slicing', () => {
  it('ignores tasks older than the 5-task window', () => {
    // 3 difficulty skips way in the past, recent 5 are fine
    const tasks = [
      hardSkip(1), hardSkip(2), hardSkip(3), // outside window
      done(4), done(5), done(6), done(7), done(8), // 5 most recent
    ];
    expect(shouldPrompt(tasks, 9)).toBe(false);
  });

  it('window is always the most recent N tasks (not calendar days)', () => {
    // 2 difficulty skips within the last 5 completed/skipped tasks
    const tasks = [
      done(1), done(2), done(3),
      hardSkip(4), hardSkip(5),
    ];
    expect(shouldPrompt(tasks, 6)).toBe(false); // only 2 difficulty skips in window
  });
});

// ─── Minimum sample size ─────────────────────────────────────────────────────

describe('computeDifficultySignal — minimum sample size', () => {
  it('returns false when fewer than 3 tasks in window', () => {
    const tasks = [hardSkip(1), hardSkip(2)];
    expect(shouldPrompt(tasks, 3)).toBe(false);
  });

  it('returns false for empty task list', () => {
    expect(shouldPrompt([], 5)).toBe(false);
  });

  it('returns false for exactly 3 tasks with only 2 difficulty skips', () => {
    const tasks = [hardSkip(1), hardSkip(2), done(3)];
    expect(shouldPrompt(tasks, 4)).toBe(false);
  });
});

// ─── Combined signals ─────────────────────────────────────────────────────────

describe('computeDifficultySignal — OR logic (either threshold)', () => {
  it('triggers if EITHER difficulty-skip OR low-mood threshold is met', () => {
    // 3 difficulty skips (threshold met), 0 low moods
    const tasksA = [hardSkip(1), hardSkip(2), hardSkip(3), done(4), done(5)];
    expect(shouldPrompt(tasksA, 6)).toBe(true);

    // 0 difficulty skips, 4 low moods (threshold met)
    const tasksB = [done(1, 1), done(2, 2), done(3, 1), done(4, 2), done(5, 5)];
    expect(shouldPrompt(tasksB, 6)).toBe(true);
  });
});

// ─── Cooldown gate (real logic the old test copy omitted entirely) ──────────

describe('computeDifficultySignal — prompt cooldown gate', () => {
  const tasks = [hardSkip(1), hardSkip(2), hardSkip(3), done(4), done(5)]; // threshold met

  it('suppresses the prompt while in cooldown even when the threshold is met', () => {
    const signal = computeDifficultySignal({
      tasks, currentDay: 6, streak: 0,
      inPromptCooldown: true, inRecalCooldown: false, eventDriven: false,
    });
    expect(signal.shouldPrompt).toBe(false);
  });

  it('allows the prompt once out of cooldown', () => {
    const signal = computeDifficultySignal({
      tasks, currentDay: 6, streak: 0,
      inPromptCooldown: false, inRecalCooldown: false, eventDriven: false,
    });
    expect(signal.shouldPrompt).toBe(true);
  });
});

// ─── Early-recalibration trigger (fallback consecutive-skip path) ────────────

describe('computeDifficultySignal — early recalibration (non-event-driven)', () => {
  it('fires on ≥3 consecutive most-recent difficulty skips when not in recal cooldown', () => {
    // Most recent (highest day) first after sort: days 5,4,3 are skips → 3 consecutive
    const tasks = [done(1), done(2), hardSkip(3), hardSkip(4), hardSkip(5)];
    const signal = computeDifficultySignal({
      tasks, currentDay: 6, streak: 0,
      inPromptCooldown: false, inRecalCooldown: false, eventDriven: false,
    });
    expect(signal.shouldTriggerEarlyRecalibration).toBe(true);
    expect(signal.triggerResult?.type).toBe('dropout_risk');
  });

  it('does not fire while in recal cooldown', () => {
    const tasks = [done(1), done(2), hardSkip(3), hardSkip(4), hardSkip(5)];
    const signal = computeDifficultySignal({
      tasks, currentDay: 6, streak: 0,
      inPromptCooldown: false, inRecalCooldown: true, eventDriven: false,
    });
    expect(signal.shouldTriggerEarlyRecalibration).toBe(false);
  });
});
