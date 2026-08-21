/**
 * Golden-output regression tests for Agent 5's tool-calling path
 * (USE_AGENT_TOOL_CALLING=true — see recalibrator.ts). This path now always uses
 * Claude's multi-turn tool-use loop (callStrategicWithTools) — the Groq single-shot
 * alternative (previously selected via USE_CLAUDE_FOR_RECALIBRATION=false) was
 * removed when the app moved to a Claude-only provider.
 *
 * Split from recalibrator.test.ts because this path needs USE_AGENT_TOOL_CALLING
 * flipped on for the whole file (flags is frozen at module load, so it's mocked
 * here rather than toggled per-test) — the default-path tests in
 * recalibrator.test.ts must keep running against real (off) defaults.
 *
 * Also covers the stone-coverage fix: agentTools.ts's tool handlers used to read
 * from narrower local dictionaries (STONE_INTERVENTIONS: 8 stones,
 * STONE_RECALIBRATION_DIRECTIVES: 5 stones) that silently fell back to generic
 * text for any stone outside that list. They now read directly from the same
 * 13-stone STONE_MODIFICATIONS / STONE_RECALIBRATION_MATRIX the non-tool path
 * uses (src/core/agents/stone-identifier/stone-taxonomy.ts) — these tests prove
 * previously-missing stones (LowConfidence, SkillGap) now resolve real guidance.
 *
 * Run: npm test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@config/feature-flags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@config/feature-flags')>();
  return { ...actual, flags: { ...actual.flags, USE_AGENT_TOOL_CALLING: true } };
});
vi.mock('@lib/ai-router', () => ({
  callReasoning: vi.fn(),
  callStrategic: vi.fn(),
  callStrategicWithTools: vi.fn(),
}));
vi.mock('@core/rag', () => ({
  retrieveKnowledgeSemantic: vi.fn().mockResolvedValue(''),
  retrieveKnowledgeHybrid: vi.fn().mockResolvedValue(''),
}));
vi.mock('@core/rag/behavioral-retriever', () => ({
  retrieveBehavioralPatterns: vi.fn().mockResolvedValue(''),
}));

import { callStrategicWithTools } from '@lib/ai-router';
import { recalibrateWeek, DEFAULT_THRESHOLDS } from '@core/agents/recalibrator';
import type { Agent5WeeklyInput } from '@core/agents/recalibrator';
import { makeCurriculumToolHandler, makeRecalibratorToolHandler } from '@lib/agentTools';
import type { AgentRoadmapV2 } from '@core/store/useStore';
import type { Agent2ProfileOutput, CompletedTaskFeedback } from '@types-app/agents';

function done(day: number, diff: number, mins: number): CompletedTaskFeedback {
  return { dayNumber: day, title: `Day ${day}`, difficultyRating: diff, completionTime: mins, skipped: false };
}

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
      userArchetype: 'The Overwhelmed Beginner', primaryStone: 'LowConfidence',
      stones: [{ type: 'LowConfidence', category: 'Psychological', trigger: 'New skills', severity: 'High', riskImpact: 0.8 }],
      agent3Guidance: [], agent5Note: '', confidence: 0.75,
    },
  };
}

function weekPlanArgsJSON(): string {
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
  });
}

beforeEach(() => {
  vi.mocked(callStrategicWithTools).mockReset();
});

describe('recalibrateWeek — USE_AGENT_TOOL_CALLING=true (Claude multi-turn tool loop)', () => {
  it('routes through the Claude tool-calling branch and produces a valid Agent5WeeklyOutput', async () => {
    vi.mocked(callStrategicWithTools).mockResolvedValueOnce({ finalText: weekPlanArgsJSON(), toolCalls: [] });
    const tasks = [done(1, 3, 28), done(2, 3, 30), done(3, 3, 27)];
    const input: Agent5WeeklyInput = {
      context: { goal: 'Learn to play guitar', timeline: 90, dailyMinutes: 30 },
      roadmap: baseRoadmap(),
      stoneProfile: baseStoneProfile(),
      completedTasks: tasks,
      currentDay: 7,
      weekNumber: 1,
      thresholds: DEFAULT_THRESHOLDS,
    };
    const result = await recalibrateWeek(input);
    expect(result.checkpointAnalysis.overallMastery).toBe('on-track');
    expect(result.recalibratedWeek.days).toHaveLength(7);
    expect(callStrategicWithTools).toHaveBeenCalledTimes(1);
  });

  it('throws a labeled error when the tool-call response is unrecoverable JSON', async () => {
    vi.mocked(callStrategicWithTools).mockResolvedValueOnce({ finalText: 'the model rambled with no JSON at all', toolCalls: [] });
    const tasks = [done(1, 3, 28)];
    const input: Agent5WeeklyInput = {
      context: { goal: 'Learn to play guitar', timeline: 90, dailyMinutes: 30 },
      roadmap: baseRoadmap(),
      stoneProfile: baseStoneProfile(),
      completedTasks: tasks,
      currentDay: 7,
      weekNumber: 1,
      thresholds: DEFAULT_THRESHOLDS,
    };
    await expect(recalibrateWeek(input)).rejects.toThrow(/\[agent:agent5-weekly\] invalid JSON/);
  });
});

describe('makeRecalibratorToolHandler — get_stone_recalibration_directives now covers all 13 stones', () => {
  it('resolves real MAINTAIN guidance for LowConfidence (previously missing from the narrow 5-stone dictionary)', async () => {
    const handler = makeRecalibratorToolHandler([done(1, 3, 28)], 30);
    const result = await handler('get_stone_recalibration_directives', { stoneType: 'LowConfidence', status: 'MAINTAIN' });
    expect(result).not.toMatch(/No specific directives for/);
    expect(result).toMatch(/evidence-building/i);
  });

  it('still falls back gracefully for a genuinely unknown stone type', async () => {
    const handler = makeRecalibratorToolHandler([done(1, 3, 28)], 30);
    const result = await handler('get_stone_recalibration_directives', { stoneType: 'NotARealStone', status: 'SIMPLIFY' });
    expect(result).toMatch(/No specific directives for NotARealStone/);
  });
});

describe('makeCurriculumToolHandler — get_stone_interventions now covers all 13 stones', () => {
  it('resolves real guidance for SkillGap (previously missing from the narrow 8-stone dictionary)', async () => {
    const handler = makeCurriculumToolHandler();
    const result = await handler('get_stone_interventions', { stoneType: 'SkillGap', severity: 'high', domain: 'Cognitive' });
    expect(result).not.toMatch(/Apply standard SkillGap interventions/);
    expect(result).toMatch(/Prerequisite Sprint/i);
  });
});
