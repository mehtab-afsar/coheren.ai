/**
 * Shadow Pipeline (5.5)
 *
 * Runs the full 5-agent pipeline in isolation for A/B comparison.
 * Guarantees:
 *   - Zero Supabase writes
 *   - Zero localStorage mutations (reads only)
 *   - All outputs written to an in-memory Map (shadowStore)
 *   - Gated behind SHADOW_PIPELINE feature flag
 *
 * Used via the debug panel to compare a live roadmap against an alternative
 * prompt configuration or stone override.
 */

import { analyzeGoal } from './goal-analyzer';
import { extractStones } from './stone-identifier';
import { buildCurriculum, buildLegacyAgent3Output } from './curriculum-builder';
import { generateTask } from './task-generator';
import { logAgentRun } from '@lib/agent-logger';
import { flags } from '@config/feature-flags';

import type {
  AgentContext,
  Agent1Output,
  Agent2ProfileOutput,
  StoneAnswer,
  DailyTask,
} from '@types-app/agents';
import type { AgentRoadmapV2 } from '@core/store/useStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShadowInput {
  goal: string;
  timeline: number;
  dailyTime: number;
  stoneAnswers: StoneAnswer[];
  category?: string;
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  behavioralFlags?: string[];
}

export interface ShadowResult {
  goalAnalysis: Agent1Output;
  stoneProfile: Agent2ProfileOutput;
  roadmap: AgentRoadmapV2;
  firstTask: DailyTask;
}

export interface DiffReport {
  totalDays: { live: number; shadow: number };
  phaseCountDiff: number;
  stoneModificationsDiff: string[];
  frameworkChanged: boolean;
  weekTitleChanges: number;
  summary: string;
}

// ─── In-memory store (never persisted) ────────────────────────────────────────

const shadowStore = new Map<string, unknown>();

// ─── Shadow pipeline ───────────────────────────────────────────────────────────

/**
 * Run the full agent pipeline in shadow mode.
 * Throws if SHADOW_PIPELINE flag is false.
 */
export async function runShadowPipeline(options: {
  input: ShadowInput;
  overrides?: { curriculumBuilderPrompt?: string };
}): Promise<ShadowResult> {
  if (!flags.SHADOW_PIPELINE) {
    throw new Error('SHADOW_PIPELINE flag is disabled');
  }

  const { input } = options;
  const shadowId = crypto.randomUUID();
  const startTime = performance.now();

  const context: AgentContext = {
    userId: 'shadow',
    goal: input.goal,
    timeline: input.timeline,
    dailyTimeAvailable: input.dailyTime,
    behavioralFlags: input.behavioralFlags ?? [],
  };

  // Agent 1
  const a1Start = performance.now();
  const goalAnalysis = await analyzeGoal(context);
  logAgentRun({
    agentName: 'agent1_goal_analyzer',
    runType: 'shadow',
    latencyMs: Math.round(performance.now() - a1Start),
    success: true,
    output: goalAnalysis,
    metadata: { shadowId },
  });

  // Agent 2
  const a2Start = performance.now();
  const stoneProfile = await extractStones(context, goalAnalysis, input.stoneAnswers);
  logAgentRun({
    agentName: 'agent2_stone_extractor',
    runType: 'shadow',
    latencyMs: Math.round(performance.now() - a2Start),
    success: true,
    output: stoneProfile,
    metadata: { shadowId },
  });

  // Agent 3
  const a3Start = performance.now();
  const roadmap = await buildCurriculum(context, goalAnalysis, stoneProfile);
  logAgentRun({
    agentName: 'agent3_curriculum_builder',
    runType: 'shadow',
    latencyMs: Math.round(performance.now() - a3Start),
    success: true,
    output: roadmap,
    metadata: { shadowId },
  });

  // Agent 4 — Day 1 only
  const a4Start = performance.now();
  const legacyRoadmap = buildLegacyAgent3Output(roadmap);
  const firstTask = await generateTask(
    1,
    legacyRoadmap,
    stoneProfile,
    input.dailyTime,
    undefined,
    input.category,
    input.skillLevel ?? 'beginner',
    undefined,
    input.goal
  );
  logAgentRun({
    agentName: 'agent4_task_generator',
    runType: 'shadow',
    latencyMs: Math.round(performance.now() - a4Start),
    success: true,
    output: firstTask,
    metadata: { shadowId },
  });

  const result: ShadowResult = { goalAnalysis, stoneProfile, roadmap, firstTask };

  // Persist to in-memory store only
  shadowStore.set(shadowId, result);

  console.debug(`[ShadowPipeline] Done in ${((performance.now() - startTime) / 1000).toFixed(1)}s — id: ${shadowId}`);

  return result;
}

// ─── Diff ─────────────────────────────────────────────────────────────────────

/**
 * Compare a live roadmap against a shadow run result.
 */
export function diffRoadmaps(live: AgentRoadmapV2, shadow: AgentRoadmapV2): DiffReport {
  const liveDays   = live.totalDays   ?? live.months.length * 30;
  const shadowDays = shadow.totalDays ?? shadow.months.length * 30;

  const phaseCountDiff = shadow.months.length - live.months.length;

  // Stone modifications: no focusAreas on months — compare primary goals as proxy
  const liveStones   = live.months.flatMap(m => m.primaryGoals ?? []);
  const shadowStones = shadow.months.flatMap(m => m.primaryGoals ?? []);
  const stoneModificationsDiff = [
    ...shadowStones.filter(s => !liveStones.includes(s)).map(s => `+ ${s}`),
    ...liveStones.filter(s => !shadowStones.includes(s)).map(s => `- ${s}`),
  ];

  // Framework changed: compare first month titles
  const frameworkChanged = live.months[0]?.title !== shadow.months[0]?.title;

  // Week title changes across all weeks
  const liveWeekTitles   = live.months.flatMap(m => m.weeks.map(w => w.title ?? ''));
  const shadowWeekTitles = shadow.months.flatMap(m => m.weeks.map(w => w.title ?? ''));
  let weekTitleChanges = 0;
  const maxLen = Math.max(liveWeekTitles.length, shadowWeekTitles.length);
  for (let i = 0; i < maxLen; i++) {
    if (liveWeekTitles[i] !== shadowWeekTitles[i]) weekTitleChanges++;
  }

  const summary = [
    `Duration: ${liveDays}d → ${shadowDays}d (${shadowDays - liveDays > 0 ? '+' : ''}${shadowDays - liveDays}d)`,
    phaseCountDiff !== 0 ? `Months: ${live.months.length} → ${shadow.months.length}` : null,
    stoneModificationsDiff.length > 0 ? `Goal focus: ${stoneModificationsDiff.slice(0, 3).join(', ')}` : null,
    frameworkChanged ? 'Framework changed' : null,
    weekTitleChanges > 0 ? `${weekTitleChanges} week title(s) changed` : null,
  ].filter(Boolean).join(' | ') || 'No significant differences';

  return {
    totalDays: { live: liveDays, shadow: shadowDays },
    phaseCountDiff,
    stoneModificationsDiff,
    frameworkChanged,
    weekTitleChanges,
    summary,
  };
}
