/**
 * Sprint History Compressor (5.1)
 *
 * After 4+ sprints (>28 tasks) the CompletedTaskFeedback[] passed to Agent 5
 * grows unboundedly. This module compresses the historical portion into a
 * compact BehaviouralSnapshot so the LLM context stays well under budget.
 *
 * Threshold: > 28 tasks (2 sprints). Below that, data is passed raw.
 *
 * Token budget:
 *   BehaviouralSnapshot + 300-word narrative ≈ 450 tokens
 *   Last 28 tasks ≈ 700 tokens
 *   Total well under the 12 000 token recalibrator headroom.
 */

import { callEconomy } from '@lib/ai-router';
import { flags } from '@config/feature-flags';
import type { CompletedTaskFeedback, Agent2ProfileOutput } from '@types-app/agents';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BehaviouralSnapshot {
  totalSprints: number;
  avgCompletionRate: number;
  stoneTrend: Record<string, 'improving' | 'stable' | 'worsening'>;
  peakPerformancePhase: string;
  knownDropoffTriggers: string[];
  lastMajorRecalibration: string;  // ISO8601 — empty string if unknown
  summaryNarrative: string;        // ≤ 300 words (LLM-generated when flag enabled)
}

export interface CompressedContext {
  recentTasks: CompletedTaskFeedback[];  // last 28 tasks (2 sprints worth)
  snapshot: BehaviouralSnapshot | null;  // null when < 4 sprints
}

// ─── Compression threshold ───────────────────────────────────────────────────

const RECENT_TASK_WINDOW = 28; // 2 sprints × 14 days

// ─── Pure stat helpers ────────────────────────────────────────────────────────

function avgCompletionRate(tasks: CompletedTaskFeedback[]): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter(t => !t.skipped).length;
  return Math.round((completed / tasks.length) * 100);
}

function detectDropoffTriggers(tasks: CompletedTaskFeedback[]): string[] {
  const skipped = tasks.filter(t => t.skipped);
  const triggers: string[] = [];
  const timeSkips = skipped.filter(t => t.skipReason === 'time').length;
  const diffSkips = skipped.filter(t => t.skipReason === 'difficulty').length;
  const healthSkips = skipped.filter(t => t.skipReason === 'health').length;
  if (timeSkips >= 3)   triggers.push('time pressure');
  if (diffSkips >= 3)   triggers.push('difficulty spikes');
  if (healthSkips >= 2) triggers.push('physical fatigue');
  return triggers;
}

function peakPhase(tasks: CompletedTaskFeedback[]): string {
  // Group by sprint (every 14 tasks) and find the best sprint number
  const sprints: number[] = [];
  for (let i = 0; i < tasks.length; i += 14) {
    const sprint = tasks.slice(i, i + 14);
    const rate = avgCompletionRate(sprint);
    sprints.push(rate);
  }
  const best = sprints.indexOf(Math.max(...sprints));
  return `Sprint ${best + 1} (days ${best * 14 + 1}–${(best + 1) * 14})`;
}

function stoneTrendFromTasks(
  tasks: CompletedTaskFeedback[],
  stoneProfile: Agent2ProfileOutput
): Record<string, 'improving' | 'stable' | 'worsening'> {
  const trend: Record<string, 'improving' | 'stable' | 'worsening'> = {};
  const stones = stoneProfile.stoneProfile.stones;

  // Simple heuristic: compare first-half vs second-half completion rate
  const mid = Math.floor(tasks.length / 2);
  const firstHalf  = avgCompletionRate(tasks.slice(0, mid));
  const secondHalf = avgCompletionRate(tasks.slice(mid));
  const delta = secondHalf - firstHalf;

  for (const s of stones) {
    if (delta > 10)       trend[s.type] = 'improving';
    else if (delta < -10) trend[s.type] = 'worsening';
    else                  trend[s.type] = 'stable';
  }

  return trend;
}

// ─── Optional LLM narrative ───────────────────────────────────────────────────

async function generateNarrative(
  olderTasks: CompletedTaskFeedback[],
  stoneProfile: Agent2ProfileOutput,
  avgRate: number,
  triggers: string[]
): Promise<string> {
  const prompt = `Summarize this learner's historical performance in ≤ 300 words for a coach reading it.

Stone profile: ${stoneProfile.stoneProfile.userArchetype} (primary: ${stoneProfile.stoneProfile.primaryStone})
Historical sprints: ${Math.ceil(olderTasks.length / 14)} sprints (${olderTasks.length} tasks)
Average completion rate: ${avgRate}%
Known drop-off triggers: ${triggers.join(', ') || 'none identified'}
Difficulty skips: ${olderTasks.filter(t => t.skipReason === 'difficulty').length}
Time skips: ${olderTasks.filter(t => t.skipReason === 'time').length}
Comments sample: ${olderTasks.filter(t => t.userComment).slice(0, 3).map(t => `"${t.userComment}"`).join(', ')}

Write a concise narrative (≤ 300 words) covering:
1. Overall pattern (consistent / inconsistent / improving / declining)
2. Known strengths
3. Recurring blockers
4. What the next sprint should watch for`;

  try {
    const { content } = await callEconomy({
      messages: [
        { role: 'system', content: 'You are a learning coach. Write concisely in plain text, no markdown.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 400,
    });
    return content?.slice(0, 1500) ?? ''; // Hard cap ~300 words
  } catch {
    return `${avgRate}% average completion over ${Math.ceil(olderTasks.length / 14)} historical sprints. Triggers: ${triggers.join(', ') || 'none'}.`;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Compress sprint history for Agent 5 context.
 * Below threshold: returns raw tasks unchanged.
 * Above threshold: compresses older sprints into BehaviouralSnapshot.
 */
export async function compress(
  tasks: CompletedTaskFeedback[],
  stoneProfile: Agent2ProfileOutput
): Promise<CompressedContext> {
  if (!flags.COMPRESS_SPRINT_HISTORY || tasks.length <= RECENT_TASK_WINDOW) {
    return { recentTasks: tasks, snapshot: null };
  }

  const recentTasks = tasks.slice(-RECENT_TASK_WINDOW);
  const olderTasks  = tasks.slice(0, -RECENT_TASK_WINDOW);

  // Pure stats — no LLM
  const rate     = avgCompletionRate(olderTasks);
  const triggers = detectDropoffTriggers(olderTasks);
  const trend    = stoneTrendFromTasks(olderTasks, stoneProfile);
  const peak     = peakPhase(olderTasks);

  let narrative = `${rate}% avg completion (${Math.ceil(olderTasks.length / 14)} sprints). Drop-off triggers: ${triggers.join(', ') || 'none'}.`;

  if (flags.MICRO_RECALIBRATION_AI_CALLS) {
    narrative = await generateNarrative(olderTasks, stoneProfile, rate, triggers);
  }

  const snapshot: BehaviouralSnapshot = {
    totalSprints: Math.ceil(tasks.length / 14),
    avgCompletionRate: rate,
    stoneTrend: trend,
    peakPerformancePhase: peak,
    knownDropoffTriggers: triggers,
    lastMajorRecalibration: '',
    summaryNarrative: narrative,
  };

  return { recentTasks, snapshot };
}
