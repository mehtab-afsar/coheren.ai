/**
 * Golden-output regression tests for Agent 1 (Goal Analyzer).
 *
 * Mocks the AI router so each test controls exactly what "the LLM said" —
 * including messy output (markdown-fenced, trailing commas) — and asserts the
 * full analyzeGoal() → parseAgentJSON → validateAndNormalize → feasibility-anchor
 * pipeline produces a correct, safe Agent1Output.
 *
 * Run: npm test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@lib/ai-router', () => ({
  callReasoning: vi.fn(),
  callWithTools: vi.fn(),
}));

import { callReasoning } from '@lib/ai-router';
import { analyzeGoal } from '@core/agents/goal-analyzer';
import type { AgentContext } from '@types-app/agents';
import { queueContent, fence } from './test-utils';

function baseContext(overrides: Partial<AgentContext> = {}): AgentContext {
  return {
    userId: 'test-user',
    goal: 'Learn to play guitar',
    timeline: 90,
    dailyTimeAvailable: 30,
    ...overrides,
  };
}

function validGoalAnalysisJSON(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    goalAnalysis: {
      goal: 'Learn to play guitar',
      domain: 'Creative',
      subDomains: [],
      category: 'Guitar',
      horizon: 'Mid-term',
      intensity: 'Moderate',
      clarityScore: 0.8,
      ambiguityScore: 0.2,
      confidence: 0.85,
      smartStatus: { specific: true, measurable: true, achievable: true, relevant: true, timeBound: true },
      missingSMART: [],
      realismChecks: { timeRealism: 'Realistic', effortRealism: 'Realistic' },
      constraintsDetected: [],
      risksDetected: [],
      complexity: 'beginner',
      learningTypes: ['physical', 'cognitive'],
      typicalTimeline: { minimum: '4 weeks', realistic: '3-6 months', mastery: '2-3 years' },
      keyMilestones: ['Play first song'],
      successCriteria: ['Can play 5 songs'],
      prerequisites: [],
      commonObstacles: ['Finger pain'],
      ...overrides,
    },
  });
}

beforeEach(() => {
  vi.mocked(callReasoning).mockReset();
});

describe('analyzeGoal — clean LLM output', () => {
  it('parses a well-formed response into a valid Agent1Output', async () => {
    queueContent(callReasoning as unknown as Parameters<typeof queueContent>[0], validGoalAnalysisJSON());
    const result = await analyzeGoal(baseContext());
    expect(result.goalAnalysis.domain).toBe('Creative');
    expect(result.goalAnalysis.category).toBe('Guitar');
    expect(result.goalAnalysis.clarityScore).toBe(0.8);
  });

  it('attaches a deterministic feasibility anchor', async () => {
    queueContent(callReasoning as unknown as Parameters<typeof queueContent>[0], validGoalAnalysisJSON());
    const result = await analyzeGoal(baseContext());
    expect(result.goalAnalysis.feasibility).toBeDefined();
    expect(result.goalAnalysis.feasibility?.verdict).toMatch(/comfortable|tight|unrealistic/);
  });
});

describe('analyzeGoal — messy LLM output (markdown fence + trailing comma)', () => {
  it('repairs and parses a fenced response with a trailing comma', async () => {
    const messy = fence(
      JSON.stringify({
        goalAnalysis: {
          goal: 'Learn to play guitar',
          domain: 'Creative',
          category: 'Guitar',
          horizon: 'Mid-term',
          intensity: 'Moderate',
          clarityScore: 0.7,
          ambiguityScore: 0.3,
          confidence: 0.6,
          smartStatus: { specific: true, measurable: false, achievable: true, relevant: true, timeBound: false },
          realismChecks: { timeRealism: 'Realistic', effortRealism: 'Realistic' },
          complexity: 'beginner',
          typicalTimeline: { minimum: '4 weeks', realistic: '3 months', mastery: '2 years' },
        },
      }),
    ).replace(/}\n```/, ',}\n```'); // inject a trailing comma before the closing fence

    queueContent(callReasoning as unknown as Parameters<typeof queueContent>[0], messy);
    const result = await analyzeGoal(baseContext());
    expect(result.goalAnalysis.domain).toBe('Creative');
  });
});

describe('analyzeGoal — coercion of malformed fields', () => {
  it('defaults an invalid domain to Cognitive', async () => {
    queueContent(callReasoning as unknown as Parameters<typeof queueContent>[0], validGoalAnalysisJSON({ domain: 'NotARealDomain' }));
    const result = await analyzeGoal(baseContext({ goal: 'Do a thing with no domain keywords' }));
    expect(result.goalAnalysis.domain).toBe('Cognitive');
  });

  it('defaults an invalid horizon to Mid-term and clamps out-of-range scores', async () => {
    queueContent(
      callReasoning as unknown as Parameters<typeof queueContent>[0],
      validGoalAnalysisJSON({ horizon: 'Whenever', clarityScore: 5, ambiguityScore: -3 }),
    );
    const result = await analyzeGoal(baseContext());
    expect(result.goalAnalysis.horizon).toBe('Mid-term');
    expect(result.goalAnalysis.clarityScore).toBe(1);
    expect(result.goalAnalysis.ambiguityScore).toBe(0);
  });

  it('throws a clear error when goalAnalysis is missing entirely', async () => {
    queueContent(callReasoning as unknown as Parameters<typeof queueContent>[0], JSON.stringify({ notGoalAnalysis: {} }));
    await expect(analyzeGoal(baseContext())).rejects.toThrow(/Missing goalAnalysis/);
  });

  it('throws a labeled error on unrecoverable JSON', async () => {
    queueContent(callReasoning as unknown as Parameters<typeof queueContent>[0], 'the model rambled with no JSON at all');
    await expect(analyzeGoal(baseContext())).rejects.toThrow(/\[agent:agent1-reasoning\] invalid JSON/);
  });
});

describe('analyzeGoal — domain keyword override', () => {
  it('overrides an LLM misclassification when the goal text contains a strong domain keyword', async () => {
    queueContent(callReasoning as unknown as Parameters<typeof queueContent>[0], validGoalAnalysisJSON({ domain: 'Cognitive' }));
    const result = await analyzeGoal(baseContext({ goal: 'Start investing in index funds' }));
    expect(result.goalAnalysis.domain).toBe('Financial');
  });
});

describe('analyzeGoal — goalType keyword override', () => {
  it('overrides goalType to behavior_based for routine/consistency goals even when the LLM omits it', async () => {
    queueContent(
      callReasoning as unknown as Parameters<typeof queueContent>[0],
      validGoalAnalysisJSON({ domain: 'Lifestyle', category: 'Discipline' }),
    );
    const result = await analyzeGoal(baseContext({ goal: 'Build a consistent morning routine' }));
    expect(result.goalAnalysis.goalType).toBe('behavior_based');
  });
});

describe('analyzeGoal — feasibility anchor tightens but never loosens realism', () => {
  it('forces timeRealism to Unrealistic when the deterministic hours math says so, even if the LLM said Realistic', async () => {
    // 5 min/day for 3 days is nowhere near enough for "learn guitar" — feasibility.ts
    // should compute an unrealistic verdict regardless of what the LLM claimed.
    queueContent(
      callReasoning as unknown as Parameters<typeof queueContent>[0],
      validGoalAnalysisJSON({ realismChecks: { timeRealism: 'Realistic', effortRealism: 'Realistic' } }),
    );
    const result = await analyzeGoal(baseContext({ goal: 'Learn to play guitar', timeline: 3, dailyTimeAvailable: 5 }));
    expect(result.goalAnalysis.feasibility?.verdict).toBe('unrealistic');
    expect(result.goalAnalysis.realismChecks.timeRealism).toBe('Unrealistic');
  });
});
