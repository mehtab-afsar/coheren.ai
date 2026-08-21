/**
 * Golden-output regression tests for Agent 2 Mode 2 (Stone Extractor).
 *
 * Mocks the AI router so each test controls exactly what "the LLM said" and
 * asserts the full extractStones() → parseAgentJSON → validateOutput pipeline
 * produces a taxonomy-safe Agent2ProfileOutput. Also covers crossValidateStones(),
 * the deterministic vote-based corrector for the two hardcoded confusion pairs.
 *
 * Run: npm test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@lib/ai-router', () => ({
  callReasoning: vi.fn(),
  callWithTools: vi.fn(),
}));

import { callReasoning } from '@lib/ai-router';
import { extractStones, crossValidateStones } from '@core/agents/stone-identifier/stone-extractor';
import type { AgentContext, Agent1Output, StoneAnswer, PreliminaryStone } from '@types-app/agents';
import { queueContent, fence } from '../../__tests__/test-utils';

function baseContext(): AgentContext {
  return { userId: 'test-user', goal: 'Learn to play guitar', timeline: 90, dailyTimeAvailable: 30 };
}

function baseGoalAnalysis(): Agent1Output {
  return {
    goalAnalysis: {
      goal: 'Learn to play guitar', domain: 'Creative', subDomains: [], category: 'Guitar',
      horizon: 'Mid-term', intensity: 'Moderate', clarityScore: 0.8, ambiguityScore: 0.2, confidence: 0.85,
      smartStatus: { specific: true, measurable: true, achievable: true, relevant: true, timeBound: true },
      missingSMART: [], realismChecks: { timeRealism: 'Realistic', effortRealism: 'Realistic' },
      constraintsDetected: [], risksDetected: [], complexity: 'beginner', learningTypes: ['physical'],
      typicalTimeline: { minimum: '4 weeks', realistic: '3 months', mastery: '2 years' },
      keyMilestones: [], successCriteria: [], prerequisites: [], commonObstacles: [],
    },
  };
}

const answers: StoneAnswer[] = [
  { stoneId: 'q1', answer: 'often', impact: {} },
];

function validStoneProfileJSON(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    stoneProfile: {
      userArchetype: 'The Overwhelmed Beginner',
      primaryStone: 'ProcrastinationPattern',
      stones: [
        { type: 'ProcrastinationPattern', category: 'Behavioural', trigger: 'Evenings', severity: 'High', riskImpact: 0.8 },
        { type: 'LowConfidence', category: 'Psychological', trigger: 'New skills', severity: 'Moderate', riskImpact: 0.5 },
      ],
      agent3Guidance: ['Use starter steps'],
      agent5Note: 'Watch for skipped days',
      confidence: 0.75,
      ...overrides,
    },
  });
}

beforeEach(() => {
  vi.mocked(callReasoning).mockReset();
});

describe('extractStones — clean LLM output', () => {
  it('parses a well-formed response into a valid Agent2ProfileOutput', async () => {
    queueContent(callReasoning as unknown as Parameters<typeof queueContent>[0], validStoneProfileJSON());
    const result = await extractStones(baseContext(), baseGoalAnalysis(), answers);
    expect(result.stoneProfile.primaryStone).toBe('ProcrastinationPattern');
    expect(result.stoneProfile.stones).toHaveLength(2);
  });
});

describe('extractStones — messy LLM output (markdown fence + trailing comma)', () => {
  it('repairs and parses a fenced response with a trailing comma', async () => {
    const messy = fence(validStoneProfileJSON()).replace(/}\n```/, ',}\n```');
    queueContent(callReasoning as unknown as Parameters<typeof queueContent>[0], messy);
    const result = await extractStones(baseContext(), baseGoalAnalysis(), answers);
    expect(result.stoneProfile.primaryStone).toBe('ProcrastinationPattern');
  });
});

describe('extractStones — taxonomy filtering', () => {
  it('drops stones with a type outside the closed taxonomy', async () => {
    queueContent(
      callReasoning as unknown as Parameters<typeof queueContent>[0],
      validStoneProfileJSON({
        stones: [
          { type: 'ProcrastinationPattern', category: 'Behavioural', trigger: 'Evenings', severity: 'High', riskImpact: 0.8 },
          { type: 'MadeUpStoneType', category: 'Behavioural', trigger: 'X', severity: 'High', riskImpact: 0.9 },
        ],
      }),
    );
    const result = await extractStones(baseContext(), baseGoalAnalysis(), answers);
    expect(result.stoneProfile.stones).toHaveLength(1);
    expect(result.stoneProfile.stones[0].type).toBe('ProcrastinationPattern');
  });

  it('defaults primaryStone to LowConfidence when the LLM returns an invalid taxonomy value', async () => {
    queueContent(callReasoning as unknown as Parameters<typeof queueContent>[0], validStoneProfileJSON({ primaryStone: 'NotAStone' }));
    const result = await extractStones(baseContext(), baseGoalAnalysis(), answers);
    expect(result.stoneProfile.primaryStone).toBe('LowConfidence');
  });

  it('caps stones at 4 even when the LLM returns more', async () => {
    const stones = ['TimeConstraint', 'ResourceGap', 'Inconsistency', 'FearOfFailure', 'Perfectionism', 'SkillGap']
      .map(type => ({ type, category: 'Behavioural', trigger: 'X', severity: 'Moderate', riskImpact: 0.5 }));
    queueContent(callReasoning as unknown as Parameters<typeof queueContent>[0], validStoneProfileJSON({ stones }));
    const result = await extractStones(baseContext(), baseGoalAnalysis(), answers);
    expect(result.stoneProfile.stones.length).toBeLessThanOrEqual(4);
  });

  it('clamps out-of-range riskImpact into [0, 1]', async () => {
    queueContent(
      callReasoning as unknown as Parameters<typeof queueContent>[0],
      validStoneProfileJSON({
        stones: [{ type: 'TimeConstraint', category: 'Logistical', trigger: 'X', severity: 'High', riskImpact: 5 }],
      }),
    );
    const result = await extractStones(baseContext(), baseGoalAnalysis(), answers);
    expect(result.stoneProfile.stones[0].riskImpact).toBe(1);
  });

  it('throws a clear error when stoneProfile is missing entirely', async () => {
    queueContent(callReasoning as unknown as Parameters<typeof queueContent>[0], JSON.stringify({ notStoneProfile: {} }));
    await expect(extractStones(baseContext(), baseGoalAnalysis(), answers)).rejects.toThrow(/Missing stoneProfile/);
  });
});

describe('crossValidateStones — TimeConstraint ↔ ProcrastinationPattern confusion', () => {
  it('reclassifies TimeConstraint as ProcrastinationPattern when Round 2 evidence points to procrastination', () => {
    const preliminary: PreliminaryStone[] = [
      { type: 'TimeConstraint', confidence: 0.6 },
      { type: 'LowConfidence', confidence: 0.4 },
    ];
    const round2Answers: StoneAnswer[] = [
      { stoneId: 'q1', answer: 'a', impact: { pointsTo: 'ProcrastinationPattern' } },
      { stoneId: 'q2', answer: 'b', impact: { pointsTo: 'ProcrastinationPattern' } },
    ];
    const result = crossValidateStones(preliminary, round2Answers);
    expect(result.correctedPrimary).toBe('ProcrastinationPattern');
    expect(result.contradictionResolved).toMatch(/TimeConstraint reclassified as ProcrastinationPattern/);
  });

  it('leaves TimeConstraint alone when Round 2 evidence does not outvote it', () => {
    const preliminary: PreliminaryStone[] = [{ type: 'TimeConstraint', confidence: 0.8 }];
    const round2Answers: StoneAnswer[] = [
      { stoneId: 'q1', answer: 'a', impact: { pointsTo: 'TimeConstraint' } },
    ];
    const result = crossValidateStones(preliminary, round2Answers);
    expect(result.contradictionResolved).toBeNull();
    expect(result.correctedPrimary).toBe('TimeConstraint');
  });
});

describe('crossValidateStones — Perfectionism ↔ FearOfFailure disambiguation', () => {
  it('reclassifies Perfectionism as FearOfFailure when Round 2 evidence outvotes it and FearOfFailure is not already present', () => {
    const preliminary: PreliminaryStone[] = [{ type: 'Perfectionism', confidence: 0.6 }];
    const round2Answers: StoneAnswer[] = [
      { stoneId: 'q1', answer: 'a', impact: { pointsTo: 'FearOfFailure' } },
      { stoneId: 'q2', answer: 'b', impact: { pointsTo: 'FearOfFailure' } },
    ];
    const result = crossValidateStones(preliminary, round2Answers);
    expect(result.correctedPrimary).toBe('FearOfFailure');
    expect(result.contradictionResolved).toMatch(/Perfectionism reclassified as FearOfFailure/);
  });
});
