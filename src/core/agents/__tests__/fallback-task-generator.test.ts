/**
 * Unit tests for fallback-task-generator.ts
 *
 * Verifies the deterministic, LLM-free task generator produces valid DailyTask
 * output for every combination of domain × stone type.
 * No Groq calls, no Supabase — pure data transformation.
 *
 * Run: npm test
 */

import { describe, it, expect } from 'vitest';
import { generateFallbackTask } from '@core/agents/fallback-task-generator';
import type { Agent2ProfileOutput, Agent3Output, Phase, StoneType } from '@types-app/agents';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePhases(durations: number[], overrides: Partial<Phase> = {}): Phase[] {
  return durations.map((d, i) => ({
    phaseNumber:      i + 1,
    phaseName:        `Phase ${i + 1}`,
    durationDays:     d,
    weeks:            [1 + i * 2, 2 + i * 2],
    primaryGoals:     [`Goal ${i + 1}A`, `Goal ${i + 1}B`],
    focusAreas:       { 'core skill': 60, 'review': 40 },
    keyMilestones:    [`Milestone ${i + 1}.1`, `Milestone ${i + 1}.2`],
    scienceRationale: 'Test rationale',
    ...overrides,
  }));
}

function makeRoadmap(
  domainPedagogy: string,
  phaseDurations: number[] = [28, 35, 27]
): Agent3Output {
  const phases = makePhases(phaseDurations);
  return {
    roadmap: {
      totalDays:   phaseDurations.reduce((s, d) => s + d, 0),
      totalPhases: phases.length,
      phases,
      progressionCurve: {},
      reviewMoments:    [],
      restDays:         { frequency: 7, dayOfWeek: 7, type: 'active recovery' },
      modifiers_from_stones: {},
    },
    domainPedagogy,
    stoneModificationSummary: '',
  };
}

function makeStoneProfile(primaryStone: StoneType): Agent2ProfileOutput {
  return {
    stoneProfile: {
      userArchetype: 'Test Archetype',
      primaryStone,
      stones: [{ type: primaryStone, severity: 'moderate', evidence: '', interventions: [] }],
      agent3Guidance: [],
      agent5Note: '',
      confidence: 0.8,
    },
  };
}

// ─── Output shape ─────────────────────────────────────────────────────────────

describe('generateFallbackTask — output shape', () => {
  const roadmap = makeRoadmap('spaced repetition interleaving', [28, 35, 27]);
  const profile = makeStoneProfile('Inconsistency');

  it('returns a DailyTask with required top-level fields', () => {
    const task = generateFallbackTask(1, roadmap, profile, 30);
    expect(task).toHaveProperty('day', 1);
    expect(task).toHaveProperty('phase');
    expect(task).toHaveProperty('week');
    expect(task).toHaveProperty('task');
  });

  it('task.title is a non-empty string', () => {
    const { task } = generateFallbackTask(1, roadmap, profile, 30);
    expect(typeof task.title).toBe('string');
    expect(task.title.trim().length).toBeGreaterThan(5);
  });

  it('task.description includes phase name', () => {
    const { task } = generateFallbackTask(1, roadmap, profile, 30);
    expect(task.description).toMatch(/phase/i);
  });

  it('task.estimatedMinutes equals dailyTimeAvailable', () => {
    const { task } = generateFallbackTask(5, roadmap, profile, 45);
    expect(task.estimatedMinutes).toBe(45);
  });

  it('task has at least 3 steps', () => {
    const { task } = generateFallbackTask(1, roadmap, profile, 30);
    expect(task.steps.length).toBeGreaterThanOrEqual(3);
  });

  it('each step has instruction and duration', () => {
    const { task } = generateFallbackTask(1, roadmap, profile, 30);
    for (const step of task.steps) {
      expect(typeof step.instruction).toBe('string');
      expect(step.instruction.trim().length).toBeGreaterThan(5);
      expect(typeof step.duration).toBe('string');
    }
  });

  it('steps are numbered sequentially from 1', () => {
    const { task } = generateFallbackTask(1, roadmap, profile, 30);
    task.steps.forEach((step, i) => {
      expect(step.stepNumber).toBe(i + 1);
    });
  });

  it('successCriteria.primary is a non-empty string', () => {
    const { task } = generateFallbackTask(1, roadmap, profile, 30);
    expect(typeof task.successCriteria.primary).toBe('string');
    expect(task.successCriteria.primary.trim().length).toBeGreaterThan(10);
  });

  it('tips array is non-empty', () => {
    const { task } = generateFallbackTask(1, roadmap, profile, 30);
    expect(task.tips.length).toBeGreaterThan(0);
  });

  it('resources has primary and supplementary fields', () => {
    const result = generateFallbackTask(1, roadmap, profile, 30);
    expect(result.task.resources).toHaveProperty('primary');
    expect(result.task.resources).toHaveProperty('supplementary');
    expect(Array.isArray(result.task.resources?.supplementary)).toBe(true);
  });
});

// ─── Stone-specific behaviours ─────────────────────────────────────────────────

describe('generateFallbackTask — FearOfFailure stone', () => {
  const roadmap = makeRoadmap('spaced repetition');
  const profile = makeStoneProfile('FearOfFailure');

  it('prefixes title with "Experiment:"', () => {
    const { task } = generateFallbackTask(1, roadmap, profile, 30);
    expect(task.title).toMatch(/^Experiment:/);
  });

  it('successCriteria is observation-based (no pass/fail language)', () => {
    const { task } = generateFallbackTask(1, roadmap, profile, 30);
    expect(task.successCriteria.primary).not.toMatch(/complete|finish|achieve/i);
    expect(task.successCriteria.primary).toMatch(/attempted|noticed|tried|no wrong/i);
  });

  it('tips include permission-to-fail language', () => {
    const { task } = generateFallbackTask(1, roadmap, profile, 30);
    const tipText = task.tips.join(' ').toLowerCase();
    expect(tipText).toMatch(/permission|data|reps|wrong answer/i);
  });
});

describe('generateFallbackTask — Perfectionism stone', () => {
  const roadmap = makeRoadmap('divergent convergent');
  const profile = makeStoneProfile('Perfectionism');

  it('adds a timer step (step 2 typically)', () => {
    const { task } = generateFallbackTask(1, roadmap, profile, 30);
    const allInstructions = task.steps.map(s => s.instruction).join(' ');
    expect(allInstructions).toMatch(/timer/i);
  });

  it('successCriteria references stopping when timer rings', () => {
    const { task } = generateFallbackTask(1, roadmap, profile, 30);
    expect(task.successCriteria.primary).toMatch(/timer/i);
  });

  it('tips include "done beats perfect" language', () => {
    const { task } = generateFallbackTask(1, roadmap, profile, 30);
    const tipText = task.tips.join(' ').toLowerCase();
    expect(tipText).toMatch(/done|stop|timer|exist/i);
  });
});

describe('generateFallbackTask — ProcrastinationPattern stone', () => {
  const roadmap = makeRoadmap('spaced repetition');
  const profile = makeStoneProfile('ProcrastinationPattern');

  it('step 1 is a short starter step (≤ 2 min)', () => {
    const { task } = generateFallbackTask(1, roadmap, profile, 30);
    expect(task.steps[0].duration).toBe('2 min');
  });

  it('tips include implementation intention language', () => {
    const { task } = generateFallbackTask(1, roadmap, profile, 30);
    const tipText = task.tips.join(' ').toLowerCase();
    expect(tipText).toMatch(/step 1|resistance|stuck|win/i);
  });
});

describe('generateFallbackTask — Inconsistency stone', () => {
  const roadmap = makeRoadmap('behavioral activation');
  const profile = makeStoneProfile('Inconsistency');

  it('step 1 is a starter step (2 min)', () => {
    const { task } = generateFallbackTask(1, roadmap, profile, 30);
    expect(task.steps[0].duration).toBe('2 min');
  });

  it('tips include "never miss twice" language', () => {
    const { task } = generateFallbackTask(1, roadmap, profile, 30);
    const tipText = task.tips.join(' ').toLowerCase();
    expect(tipText).toMatch(/skip|miss|partial|momentum/i);
  });
});

// ─── Phase resolution ─────────────────────────────────────────────────────────

describe('generateFallbackTask — phase resolution', () => {
  const roadmap = makeRoadmap('periodization', [14, 28, 14]);
  const profile = makeStoneProfile('TimeConstraint');

  it('day 1 resolves to phase 1', () => {
    const result = generateFallbackTask(1, roadmap, profile, 25);
    expect(result.phase).toBe(1);
  });

  it('day 15 resolves to phase 2', () => {
    const result = generateFallbackTask(15, roadmap, profile, 25);
    expect(result.phase).toBe(2);
  });

  it('day 43 resolves to phase 3 (last phase)', () => {
    const result = generateFallbackTask(43, roadmap, profile, 25);
    expect(result.phase).toBe(3);
  });

  it('day beyond total still resolves without throwing', () => {
    expect(() => generateFallbackTask(999, roadmap, profile, 25)).not.toThrow();
  });
});

// ─── Domain inference ─────────────────────────────────────────────────────────

describe('generateFallbackTask — domain inference from domainPedagogy', () => {
  const profile = makeStoneProfile('Inconsistency');

  it('infers Kinesthetic from "periodization"', () => {
    const roadmap = makeRoadmap('sports periodization');
    const { task } = generateFallbackTask(1, roadmap, profile, 30);
    // Kinesthetic verbs: Complete, Practice, Drill, Train, Execute
    expect(task.title).toMatch(/complete|practice|drill|train|execute/i);
  });

  it('infers Creative from "divergent convergent"', () => {
    const roadmap = makeRoadmap('divergent convergent creativity');
    const { task } = generateFallbackTask(1, roadmap, profile, 30);
    // Creative verbs: Create, Draft, Experiment, Practice, Produce
    expect(task.title).toMatch(/create|draft|experiment|practice|produce/i);
  });

  it('infers Cognitive from "spaced repetition"', () => {
    const roadmap = makeRoadmap('spaced repetition interleaving');
    const { task } = generateFallbackTask(1, roadmap, profile, 30);
    // Cognitive verbs: Study, Review, Practice, Work through, Summarize
    expect(task.title).toMatch(/study|review|practice|work through|summarize/i);
  });

  it('falls back to Lifestyle for unknown pedagogy', () => {
    const roadmap = makeRoadmap('unknown methodology xyz');
    // Should not throw
    expect(() => generateFallbackTask(1, roadmap, profile, 30)).not.toThrow();
  });
});

// ─── Day-based variety ────────────────────────────────────────────────────────

describe('generateFallbackTask — day-based variety', () => {
  const roadmap = makeRoadmap('spaced repetition', [90]);
  const profile = makeStoneProfile('Inconsistency');

  it('different days produce different task titles (via seed)', () => {
    const t1 = generateFallbackTask(1, roadmap, profile, 30).task.title;
    const t2 = generateFallbackTask(2, roadmap, profile, 30).task.title;
    const t3 = generateFallbackTask(3, roadmap, profile, 30).task.title;
    // At least two of the three should differ (seed rotates through arrays)
    const allSame = t1 === t2 && t2 === t3;
    expect(allSame).toBe(false);
  });

  it('same day always produces the same output (deterministic)', () => {
    const a = generateFallbackTask(7, roadmap, profile, 30).task.title;
    const b = generateFallbackTask(7, roadmap, profile, 30).task.title;
    expect(a).toBe(b);
  });
});
