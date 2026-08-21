/**
 * Unit tests for recalibrator.ts pure-logic functions, plus golden-output
 * regression tests for recalibrateWeek() (the live weekly recalibration path
 * wired into useCheckpoint.ts).
 *
 * computeSignals/shouldTriggerCheckpoint are pure — no mocking needed.
 * recalibrateWeek() mocks the AI router and RAG so it runs fully offline.
 *
 * Run: npm test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeSignals, shouldTriggerCheckpoint } from '@core/agents/recalibrator';
import type { CompletedTaskFeedback } from '@types-app/agents';

vi.mock('@lib/ai-router', () => ({
  callReasoning: vi.fn(),
  callStrategic: vi.fn(),
  callStrategicWithTools: vi.fn(),
}));
vi.mock('@core/rag', () => ({
  retrieveKnowledgeSemantic: vi.fn().mockResolvedValue(''),
  retrieveKnowledgeHybrid: vi.fn().mockResolvedValue(''),
}));

import { callReasoning } from '@lib/ai-router';
import { recalibrateWeek, DEFAULT_THRESHOLDS } from '@core/agents/recalibrator';
import type { Agent5WeeklyInput } from '@core/agents/recalibrator';
import type { AgentRoadmapV2 } from '@core/store/useStore';
import type { Agent2ProfileOutput } from '@types-app/agents';
import { queueContent, fence } from './test-utils';

// ─── Helpers ────────────────────────────────────────────────────────────────

function done(day: number, diff: number, mins: number, title = `Day ${day}`): CompletedTaskFeedback {
  return { dayNumber: day, title, difficultyRating: diff, completionTime: mins, skipped: false };
}

function skip(
  day: number,
  reason: 'time' | 'health' | 'difficulty' | 'external' = 'time',
  title = `Day ${day}`,
): CompletedTaskFeedback {
  return { dayNumber: day, title, difficultyRating: 0, completionTime: 0, skipped: true, skipReason: reason };
}

const BUDGET = 30;

// ─── computeSignals — ACCELERATE ────────────────────────────────────────────

describe('computeSignals — ACCELERATE', () => {
  it('triggers when completionRate ≥ 80% and avgDifficulty ≤ 2.5', () => {
    const tasks = [
      done(1, 2, 25), done(2, 2, 24), done(3, 2, 26),
      done(4, 3, 28), done(5, 2, 22), done(6, 2, 27),
      done(7, 2, 25), done(8, 2, 28), done(9, 3, 30),
      done(10, 2, 26),
    ];
    const s = computeSignals(tasks, BUDGET);
    expect(s.status).toBe('ACCELERATE');
    expect(s.completionRate).toBe(100);
    expect(s.avgDifficulty).toBeLessThanOrEqual(2.5);
  });

  it('does NOT accelerate if avgDifficulty > 2.5 even with 100% completion', () => {
    const tasks = [
      done(1, 3, 28), done(2, 3, 30), done(3, 3, 32),
      done(4, 3, 29), done(5, 3, 27),
    ];
    const s = computeSignals(tasks, BUDGET);
    expect(s.status).toBe('MAINTAIN');
  });

  it('does NOT accelerate if completionRate < 80%', () => {
    // 7/10 = 70% with avg diff 2.0
    const tasks = [
      done(1, 2, 25), done(2, 2, 24), done(3, 2, 26),
      done(4, 2, 23), done(5, 2, 27), done(6, 2, 25), done(7, 2, 28),
      skip(8), skip(9), skip(10),
    ];
    const s = computeSignals(tasks, BUDGET);
    expect(s.status).not.toBe('ACCELERATE');
  });
});

// ─── computeSignals — MAINTAIN ───────────────────────────────────────────────

describe('computeSignals — MAINTAIN', () => {
  it('returns MAINTAIN for 80% completion with avgDifficulty 3.0 (Alex MAINTAIN scenario)', () => {
    const tasks = [
      done(1, 2, 28), done(2, 2, 30), done(3, 3, 34), done(4, 5, 47), done(5, 3, 32),
      skip(6, 'time'), skip(7, 'time'),
      done(8, 4, 42), done(9, 3, 33), done(10, 2, 29),
    ];
    const s = computeSignals(tasks, BUDGET);
    expect(s.status).toBe('MAINTAIN');
    expect(s.completionRate).toBe(80);
    expect(s.consecutiveSkips).toBe(2);
    expect(s.timeSkips).toBe(2);
    expect(s.healthSkips).toBe(0);
  });

  it('counts hardDays and easyDays correctly', () => {
    const tasks = [
      done(1, 5, 40), done(2, 4, 38), done(3, 2, 20), done(4, 2, 22), done(5, 3, 30),
    ];
    const s = computeSignals(tasks, BUDGET);
    expect(s.hardDays).toBe(2); // diff >= 4
    expect(s.easyDays).toBe(2); // diff <= 2
  });

  it('returns MAINTAIN for empty task list', () => {
    const s = computeSignals([], BUDGET);
    expect(s.status).toBe('MAINTAIN');
    expect(s.totalTasks).toBe(0);
    expect(s.completionRate).toBe(0);
  });
});

// ─── computeSignals — SIMPLIFY ───────────────────────────────────────────────

describe('computeSignals — SIMPLIFY', () => {
  it('triggers when completionRate < 60%', () => {
    // 6/14 = ~42.9%, maxStreak=2, healthSkips=0 → SIMPLIFY
    const tasks = [
      done(1, 5, 40), skip(2, 'difficulty'), done(3, 5, 45), skip(4, 'difficulty'),
      done(5, 4, 38), skip(6, 'difficulty'), done(7, 5, 42),
      skip(8, 'time'), skip(9, 'time'), done(10, 5, 44),
      skip(11, 'time'), done(12, 4, 39), skip(13, 'time'), done(14, 5, 43),
    ];
    const s = computeSignals(tasks, BUDGET);
    expect(s.status).toBe('SIMPLIFY');
    expect(s.completionRate).toBeLessThan(60);
    expect(s.consecutiveSkips).toBeLessThan(4);
    expect(s.healthSkips).toBe(0);
  });

  it('triggers when avgDifficulty > 4 AND difficultySkips ≥ 2', () => {
    // 9/11 = 81.8% (passes completionRate) but avg diff 4.2, 2 diff skips → SIMPLIFY
    const tasks = [
      done(1, 5, 42), done(2, 4, 38), done(3, 5, 45), done(4, 4, 40),
      skip(5, 'difficulty'), skip(6, 'difficulty'),
      done(7, 4, 39), done(8, 5, 44), done(9, 4, 41), done(10, 5, 43), done(11, 4, 38),
    ];
    const s = computeSignals(tasks, BUDGET);
    expect(s.status).toBe('SIMPLIFY');
    expect(s.difficultySkips).toBeGreaterThanOrEqual(2);
    expect(s.avgDifficulty).toBeGreaterThan(4);
  });

  it('does NOT simplify when healthSkips ≥ 3 (RECOVER takes priority)', () => {
    const tasks = [
      done(1, 5, 40), skip(2, 'health'), done(3, 5, 42),
      skip(4, 'health'), done(5, 5, 44), skip(6, 'health'),
      done(7, 4, 38), skip(8, 'time'), skip(9, 'time'),
      done(10, 5, 45),
    ];
    const s = computeSignals(tasks, BUDGET);
    expect(s.status).toBe('RECOVER');
    expect(s.healthSkips).toBeGreaterThanOrEqual(3);
  });
});

// ─── computeSignals — RECOVER ────────────────────────────────────────────────

describe('computeSignals — RECOVER', () => {
  it('triggers when healthSkips ≥ 3 (Alex RECOVER scenario)', () => {
    const tasks = [
      done(1, 3, 30), done(2, 3, 28), done(3, 2, 25),
      skip(4, 'health'), skip(5, 'health'), skip(6, 'health'), skip(7, 'time'),
      done(8, 2, 20), done(9, 2, 22), done(10, 3, 28),
      done(11, 3, 30), done(12, 2, 26), done(13, 3, 29), done(14, 2, 27),
    ];
    const s = computeSignals(tasks, BUDGET);
    expect(s.status).toBe('RECOVER');
    expect(s.healthSkips).toBe(3);
    expect(s.consecutiveSkips).toBe(4); // days 4-7
  });

  it('triggers when consecutiveSkips ≥ 4 even with no health skips', () => {
    const tasks = [
      done(1, 3, 28), done(2, 3, 29),
      skip(3, 'time'), skip(4, 'time'), skip(5, 'time'), skip(6, 'time'),
      done(7, 3, 30), done(8, 3, 28),
    ];
    const s = computeSignals(tasks, BUDGET);
    expect(s.status).toBe('RECOVER');
    expect(s.consecutiveSkips).toBe(4);
  });

  it('correctly tracks max streak vs current streak', () => {
    // streak 2, then done, then streak 4 → max = 4
    const tasks = [
      skip(1), skip(2), done(3, 3, 28),
      skip(4), skip(5), skip(6), skip(7),
      done(8, 3, 27),
    ];
    const s = computeSignals(tasks, BUDGET);
    expect(s.consecutiveSkips).toBe(4);
    expect(s.status).toBe('RECOVER');
  });
});

// ─── computeSignals — signal fields ──────────────────────────────────────────

describe('computeSignals — signal field correctness', () => {
  it('computes avgTimeOverage correctly', () => {
    // budget=30, times: 35, 25, 40 → overages: +5, -5, +10 → avg = 10/3 ≈ 3.33
    const tasks = [done(1, 3, 35), done(2, 3, 25), done(3, 3, 40)];
    const s = computeSignals(tasks, BUDGET);
    expect(s.avgTimeOverage).toBeCloseTo(10 / 3, 2);
  });

  it('counts skip reasons correctly', () => {
    const tasks = [
      skip(1, 'health'), skip(2, 'health'), skip(3, 'time'),
      skip(4, 'difficulty'), skip(5, 'external'),
      done(6, 3, 30),
    ];
    const s = computeSignals(tasks, BUDGET);
    expect(s.healthSkips).toBe(2);
    expect(s.timeSkips).toBe(1);
    expect(s.difficultySkips).toBe(1);
    expect(s.skippedCount).toBe(5);
    expect(s.completedCount).toBe(1);
  });

  it('includes struggling and mastering areas in output', () => {
    const tasks = [
      done(1, 5, 40, 'Hard Run'),
      done(2, 2, 22, 'Easy Walk'),
      done(3, 4, 38, 'Hill Sprints'),
    ];
    const s = computeSignals(tasks, BUDGET);
    expect(s.strugglingAreas).toContain('Hard Run');
    expect(s.strugglingAreas).toContain('Hill Sprints');
    expect(s.masteringAreas).toContain('Easy Walk');
  });
});

// ─── shouldTriggerCheckpoint ─────────────────────────────────────────────────

describe('shouldTriggerCheckpoint', () => {
  it('returns true on multiples of the default interval (7 — weekly)', () => {
    expect(shouldTriggerCheckpoint(7)).toBe(true);
    expect(shouldTriggerCheckpoint(14)).toBe(true);
    expect(shouldTriggerCheckpoint(21)).toBe(true);
    expect(shouldTriggerCheckpoint(84)).toBe(true);
  });

  it('returns false on non-multiples', () => {
    expect(shouldTriggerCheckpoint(1)).toBe(false);
    expect(shouldTriggerCheckpoint(6)).toBe(false);
    expect(shouldTriggerCheckpoint(8)).toBe(false);
    expect(shouldTriggerCheckpoint(13)).toBe(false);
    expect(shouldTriggerCheckpoint(20)).toBe(false);
  });

  it('returns false for day 0', () => {
    expect(shouldTriggerCheckpoint(0)).toBe(false);
  });

  it('respects a custom interval', () => {
    expect(shouldTriggerCheckpoint(7, 7)).toBe(true);
    expect(shouldTriggerCheckpoint(21, 7)).toBe(true);
    expect(shouldTriggerCheckpoint(10, 7)).toBe(false);
    expect(shouldTriggerCheckpoint(30, 10)).toBe(true);
    expect(shouldTriggerCheckpoint(25, 10)).toBe(false);
  });
});

// ─── recalibrateWeek — golden-output regression tests ──────────────────────
// The live weekly recalibration path (useCheckpoint.ts). Status (ACCELERATE/
// MAINTAIN/SIMPLIFY/RECOVER) is pre-computed deterministically by computeSignals
// above — the LLM only elaborates the week plan text/days around it.

function baseRoadmap(): AgentRoadmapV2 {
  return {
    totalDays: 90, totalWeeks: 13, totalMonths: 3,
    domainPedagogy: 'x', frameworkName: '', frameworkReason: '', frameworkScience: '', frameworkSources: [],
    months: [{
      month: 1, title: 'Foundations', phaseName: 'Foundations', startWeek: 1, endWeek: 4, startDay: 1, endDay: 28,
      primaryGoals: ['Learn basics'], scienceRationale: '', weeks: [],
    }],
    progressionCurve: {}, stoneModificationSummary: '', modifiers_from_stones: {},
  } as unknown as AgentRoadmapV2;
}

function baseStoneProfile(): Agent2ProfileOutput {
  return {
    stoneProfile: {
      userArchetype: 'The Overwhelmed Beginner', primaryStone: 'ProcrastinationPattern',
      stones: [{ type: 'ProcrastinationPattern', category: 'Behavioural', trigger: 'Evenings', severity: 'High', riskImpact: 0.8 }],
      agent3Guidance: [], agent5Note: '', confidence: 0.75,
    },
  };
}

function weekPlanJSON(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    checkpointAnalysis: {
      checkpointDay: 7, overallMastery: 'on-track', strugglingAreas: [], masteringAreas: [],
      paceAdjustment: 'maintain', motivationalInsights: 'Great consistency', recommendations: [], nextSprintFocus: 'Chord transitions',
    },
    recalibratedWeek: {
      weekNumber: 2, title: 'Week 2', theme: 'Building fluency', startDay: 8, endDay: 14,
      paceAdjustment: 'maintain', rationale: 'Steady progress', personalizedMessage: 'Keep it up!',
      days: Array.from({ length: 7 }, (_, i) => ({
        day: 8 + i, weekDay: i + 1, type: i === 6 ? 'rest' : 'practice',
        title: `Day ${8 + i}`, theme: 'Chords', intensity: 0.3, focusArea: 'technique',
      })),
    },
    ...overrides,
  });
}

function weeklyInput(tasks: CompletedTaskFeedback[]): Agent5WeeklyInput {
  return {
    context: { goal: 'Learn to play guitar', timeline: 90, dailyMinutes: 30 },
    roadmap: baseRoadmap(),
    stoneProfile: baseStoneProfile(),
    completedTasks: tasks,
    currentDay: 7,
    weekNumber: 1,
    thresholds: DEFAULT_THRESHOLDS,
  };
}

beforeEach(() => {
  vi.mocked(callReasoning).mockReset();
});

describe('recalibrateWeek — MAINTAIN status (clean LLM output)', () => {
  it('produces a valid Agent5WeeklyOutput with a full 7-day week', async () => {
    const tasks = [done(1, 3, 28), done(2, 3, 30), done(3, 3, 27), done(4, 3, 29), done(5, 3, 28), done(6, 3, 30)];
    queueContent(callReasoning as unknown as Parameters<typeof queueContent>[0], weekPlanJSON());
    const result = await recalibrateWeek(weeklyInput(tasks));
    expect(result.checkpointAnalysis.overallMastery).toBe('on-track');
    expect(result.recalibratedWeek.days).toHaveLength(7);
    expect(result.recalibratedWeek.days[6].type).toBe('rest');
  });
});

describe('recalibrateWeek — ACCELERATE status', () => {
  it('reflects a high-completion, low-difficulty sprint', async () => {
    const tasks = [done(1, 2, 25), done(2, 2, 24), done(3, 2, 26), done(4, 2, 28), done(5, 2, 22), done(6, 2, 27)];
    queueContent(
      callReasoning as unknown as Parameters<typeof queueContent>[0],
      weekPlanJSON({ checkpointAnalysis: { checkpointDay: 7, overallMastery: 'excelling', strugglingAreas: [], masteringAreas: ['Chords'], paceAdjustment: 'accelerate', motivationalInsights: 'Crushing it', recommendations: [], nextSprintFocus: 'Advanced chords' } }),
    );
    const result = await recalibrateWeek(weeklyInput(tasks));
    expect(result.checkpointAnalysis.overallMastery).toBe('excelling');
  });
});

describe('recalibrateWeek — SIMPLIFY status', () => {
  it('reflects a low-completion sprint and still returns a full week', async () => {
    const tasks = [done(1, 4, 30), skip(2, 'difficulty'), skip(3, 'difficulty'), done(4, 4, 30), skip(5, 'time')];
    queueContent(
      callReasoning as unknown as Parameters<typeof queueContent>[0],
      weekPlanJSON({ checkpointAnalysis: { checkpointDay: 7, overallMastery: 'struggling', strugglingAreas: ['Chords'], masteringAreas: [], paceAdjustment: 'slow-down', motivationalInsights: 'Let’s ease up', recommendations: [], nextSprintFocus: 'Fundamentals' } }),
    );
    const result = await recalibrateWeek(weeklyInput(tasks));
    expect(result.checkpointAnalysis.overallMastery).toBe('struggling');
    expect(result.recalibratedWeek.days).toHaveLength(7);
  });
});

describe('recalibrateWeek — RECOVER status', () => {
  it('reflects a burnout/consecutive-skip sprint', async () => {
    const tasks = [skip(1, 'health'), skip(2, 'health'), skip(3, 'health'), skip(4, 'health')];
    queueContent(
      callReasoning as unknown as Parameters<typeof queueContent>[0],
      weekPlanJSON({ checkpointAnalysis: { checkpointDay: 7, overallMastery: 'struggling', strugglingAreas: [], masteringAreas: [], paceAdjustment: 'slow-down', motivationalInsights: 'Time to recover', recommendations: [], nextSprintFocus: 'Rest and reset' } }),
    );
    const result = await recalibrateWeek(weeklyInput(tasks));
    expect(result.checkpointAnalysis.overallMastery).toBe('struggling');
    expect(result.recalibratedWeek.days).toHaveLength(7);
  });
});

describe('recalibrateWeek — messy LLM output (markdown fence + trailing comma)', () => {
  it('repairs and parses a fenced response with a trailing comma', async () => {
    const messy = fence(weekPlanJSON()).replace(/}\n```/, ',}\n```');
    const tasks = [done(1, 3, 28), done(2, 3, 30)];
    queueContent(callReasoning as unknown as Parameters<typeof queueContent>[0], messy);
    const result = await recalibrateWeek(weeklyInput(tasks));
    expect(result.recalibratedWeek.days).toHaveLength(7);
  });

  it('throws a labeled error on unrecoverable JSON — this is what the pre-Phase-1 Claude-strategic path had no protection against', async () => {
    const tasks = [done(1, 3, 28)];
    queueContent(callReasoning as unknown as Parameters<typeof queueContent>[0], 'the model rambled with no JSON at all');
    await expect(recalibrateWeek(weeklyInput(tasks))).rejects.toThrow(/\[agent:agent5-weekly\] invalid JSON/);
  });
});
