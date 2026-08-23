/**
 * Golden-output regression tests for Agent 3 (Curriculum Builder).
 *
 * Mocks the AI router (buildCurriculum calls callPremium, aliased as callReasoning
 * in curriculum-builder.ts) and the RAG retriever so the test is fully offline.
 * Asserts the full buildCurriculum() → parseAgentJSON → validateAndNormalizeV2
 * pipeline force-fills a complete, safe AgentRoadmapV2 even from a truncated
 * or messy LLM response — this is where the audit found the highest-complexity,
 * completely untested logic (Week 1 force-fill, day-7-rest enforcement).
 *
 * Run: npm test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@lib/ai-router', () => {
  const callPremium = vi.fn();
  return {
    callPremium,
    // buildCurriculum's default path streams via callPremiumStream. Delegate to the
    // callPremium mock so the existing tests (which set callPremium.mockResolvedValueOnce)
    // keep working — yield the mocked content as a single chunk.
    callPremiumStream: vi.fn(async function* () {
      const r = await callPremium();
      yield (r as { content?: string })?.content ?? '';
    }),
    callStrategicWithThinking: vi.fn(),
    callStrategicWithTools: vi.fn(),
  };
});
vi.mock('@core/rag/semantic-retriever', () => ({
  retrieveKnowledgeSemantic: vi.fn().mockResolvedValue(''),
  retrieveKnowledgeHybrid: vi.fn().mockResolvedValue(''),
}));

import { callPremium } from '@lib/ai-router';
import { buildCurriculum } from '@core/agents/curriculum-builder';
import type { AgentContext, Agent1Output, Agent2ProfileOutput } from '@types-app/agents';
import { fence } from './test-utils';

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

function baseStoneProfile(): Agent2ProfileOutput {
  return {
    stoneProfile: {
      userArchetype: 'The Overwhelmed Beginner',
      primaryStone: 'ProcrastinationPattern',
      stones: [
        { type: 'ProcrastinationPattern', category: 'Behavioural', trigger: 'Evenings', severity: 'High', riskImpact: 0.8 },
      ],
      agent3Guidance: [], agent5Note: '', confidence: 0.75,
    },
  };
}

function fullRoadmapJSON(): string {
  return JSON.stringify({
    totalDays: 90, totalWeeks: 13, totalMonths: 3,
    domainPedagogy: 'Progressive skill-building', frameworkName: 'Suzuki-inspired', frameworkReason: '', frameworkScience: '', frameworkSources: [],
    months: [
      {
        month: 1, title: 'Foundations', startWeek: 1, endWeek: 4, startDay: 1, endDay: 28,
        primaryGoals: ['Learn open chords'], scienceRationale: 'Spaced repetition',
        weeks: [
          {
            week: 1, title: 'Week 1', theme: 'Getting started', startDay: 1, endDay: 7,
            days: Array.from({ length: 7 }, (_, i) => ({
              day: i + 1, weekDay: i + 1,
              type: i === 6 ? 'rest' : 'practice',
              title: `Day ${i + 1}`, theme: 'Chords', intensity: 0.3, focusArea: 'technique',
            })),
          },
        ],
      },
    ],
    progressionCurve: { month_1: { intensity: 0.3, volume: 'low' } },
    stoneModificationSummary: 'Starter steps for procrastination',
    modifiers_from_stones: {},
  });
}

beforeEach(() => {
  vi.mocked(callPremium).mockReset();
  vi.mocked(callPremium).mockResolvedValue({ content: '', provider: 'groq', model: 'test' });
});

describe('buildCurriculum — clean LLM output', () => {
  it('parses a well-formed roadmap into a valid AgentRoadmapV2', async () => {
    vi.mocked(callPremium).mockResolvedValueOnce({ content: fullRoadmapJSON(), provider: 'groq', model: 'test' });
    const result = await buildCurriculum(baseContext(), baseGoalAnalysis(), baseStoneProfile());
    expect(result.totalDays).toBe(90);
    expect(result.months).toHaveLength(1);
    expect(result.months[0].weeks[0].days).toHaveLength(7);
  });

  it('enforces day 7 of Week 1 as rest even when the LLM already marked it correctly', async () => {
    vi.mocked(callPremium).mockResolvedValueOnce({ content: fullRoadmapJSON(), provider: 'groq', model: 'test' });
    const result = await buildCurriculum(baseContext(), baseGoalAnalysis(), baseStoneProfile());
    expect(result.months[0].weeks[0].days[6].type).toBe('rest');
  });
});

describe('buildCurriculum — messy LLM output (markdown fence + trailing comma)', () => {
  it('repairs and parses a fenced response with a trailing comma', async () => {
    const messy = fence(fullRoadmapJSON()).replace(/}\n```/, ',}\n```');
    vi.mocked(callPremium).mockResolvedValueOnce({ content: messy, provider: 'groq', model: 'test' });
    const result = await buildCurriculum(baseContext(), baseGoalAnalysis(), baseStoneProfile());
    expect(result.totalDays).toBe(90);
  });
});

describe('buildCurriculum — truncated Week 1 (fewer than 7 days)', () => {
  it('force-fills Week 1 to exactly 7 days and still enforces day 7 = rest', async () => {
    const truncated = JSON.stringify({
      totalDays: 90, totalWeeks: 13, totalMonths: 3,
      domainPedagogy: 'Progressive skill-building',
      months: [
        {
          month: 1, title: 'Foundations', startWeek: 1, endWeek: 4, startDay: 1, endDay: 28,
          primaryGoals: [], scienceRationale: '',
          weeks: [
            {
              week: 1, title: 'Week 1', theme: '', startDay: 1, endDay: 7,
              // Model only returned 3 days instead of the required 7.
              days: [
                { day: 1, weekDay: 1, type: 'learning', title: 'Day 1', theme: '', intensity: 0.3, focusArea: 'technique' },
                { day: 2, weekDay: 2, type: 'practice', title: 'Day 2', theme: '', intensity: 0.3, focusArea: 'technique' },
                { day: 3, weekDay: 3, type: 'practice', title: 'Day 3', theme: '', intensity: 0.4, focusArea: 'technique' },
              ],
            },
          ],
        },
      ],
    });
    vi.mocked(callPremium).mockResolvedValueOnce({ content: truncated, provider: 'groq', model: 'test' });
    const result = await buildCurriculum(baseContext(), baseGoalAnalysis(), baseStoneProfile());
    const week1Days = result.months[0].weeks[0].days;
    expect(week1Days).toHaveLength(7);
    expect(week1Days[6].type).toBe('rest');
  });
});

describe('buildCurriculum — non-first weeks stay empty', () => {
  it('leaves days[] empty for weeks other than Week 1, even if the LLM populated them', async () => {
    const withWeek2Days = JSON.stringify({
      totalDays: 90, totalWeeks: 13, totalMonths: 3, domainPedagogy: 'x',
      months: [{
        month: 1, title: 'Foundations', startWeek: 1, endWeek: 4, startDay: 1, endDay: 28,
        primaryGoals: [], scienceRationale: '',
        weeks: [
          { week: 1, title: 'Week 1', theme: '', startDay: 1, endDay: 7, days: JSON.parse(fullRoadmapJSON()).months[0].weeks[0].days },
          { week: 2, title: 'Week 2', theme: '', startDay: 8, endDay: 14, days: [{ day: 8, weekDay: 1, type: 'practice', title: 'X', theme: '', intensity: 0.3, focusArea: 'x' }] },
        ],
      }],
      progressionCurve: {}, stoneModificationSummary: '', modifiers_from_stones: {},
    });
    vi.mocked(callPremium).mockResolvedValueOnce({ content: withWeek2Days, provider: 'groq', model: 'test' });
    const result = await buildCurriculum(baseContext(), baseGoalAnalysis(), baseStoneProfile());
    expect(result.months[0].weeks[1].days).toEqual([]);
  });
});

describe('buildCurriculum — throws a labeled error on unrecoverable JSON', () => {
  it('surfaces an agent3-curriculum labeled error', async () => {
    vi.mocked(callPremium).mockResolvedValueOnce({ content: 'not json at all, sorry', provider: 'groq', model: 'test' });
    await expect(buildCurriculum(baseContext(), baseGoalAnalysis(), baseStoneProfile()))
      .rejects.toThrow(/\[agent:agent3-curriculum\] invalid JSON/);
  });
});
