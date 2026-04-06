/**
 * Behavior Embedder — Change 1 (Behavioral RAG Layer)
 *
 * After each sprint checkpoint, builds a structured behavioral summary that
 * captures *why* performance was what it was, not just the numbers. Embeds it
 * with Jina and upserts to sprint_memories with rich queryable metadata.
 *
 * This is richer than the basic sprintMemory.ts path: it includes domain,
 * stone details, task type breakdown, skip patterns, and the recalibration
 * action taken — making behavioral-retriever.ts queries highly precise.
 */

import { embedQuery } from './jina-client';
import { saveSprintMemoryRow } from './database';
import { env } from '@config/env';
import type { Agent2ProfileOutput } from '@types-app/agents';

interface SprintBehaviorInput {
  userId:       string;
  goalId:       string;
  sprintNumber: number;
  domain:       string;           // e.g. 'Career', 'Health', 'Financial'
  phase:        number;           // curriculum phase number
  stoneProfile: Agent2ProfileOutput;
  completionRate:      number;    // 0–100
  avgDifficulty:       number;    // 1–5
  consecutiveSkips:    number;
  healthSkips:         number;
  difficultySkips:     number;
  timeSkips:           number;
  status:              string;    // ACCELERATE | MAINTAIN | SIMPLIFY | RECOVER
  previousStatus?:     string;
  taskTypeBreakdown:   Record<string, number>;  // { learning: 3, practice: 5, rest: 1 }
  strugglingAreas:     string[];
  masteringAreas:      string[];
  recalibrationAction: string;   // what Agent 5 decided to do
  weekRange:           string;   // e.g. "Days 8–14"
}

/**
 * Compose a human-readable narrative from sprint behavior signals.
 * Keeps it concrete and specific so semantic search retrieves meaningful matches.
 */
function composeBehaviorNarrative(input: SprintBehaviorInput): string {
  const { stoneProfile, domain, phase } = input;
  const primaryStone = stoneProfile.stoneProfile.primaryStone;
  const stones = stoneProfile.stoneProfile.stones
    .map(s => `${s.type} (severity ${s.riskImpact?.toFixed(2) ?? s.severity})`)
    .join(', ');

  const taskBreakdown = Object.entries(input.taskTypeBreakdown)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ');

  const skipDetail = [
    input.healthSkips    > 0 ? `${input.healthSkips} health skips`    : '',
    input.difficultySkips > 0 ? `${input.difficultySkips} difficulty skips` : '',
    input.timeSkips      > 0 ? `${input.timeSkips} time skips`        : '',
  ].filter(Boolean).join(', ') || 'no skips';

  const struggling = input.strugglingAreas.length > 0
    ? `Struggled with: ${input.strugglingAreas.slice(0, 3).join(', ')}.`
    : '';
  const mastering = input.masteringAreas.length > 0
    ? `Mastering: ${input.masteringAreas.slice(0, 3).join(', ')}.`
    : '';

  const trend = input.previousStatus && input.previousStatus !== input.status
    ? ` (transition from ${input.previousStatus} → ${input.status})`
    : '';

  return [
    `Sprint ${input.sprintNumber} | ${input.weekRange} | Domain: ${domain} | Phase: ${phase}`,
    `Stone profile: primary=${primaryStone}, all=[${stones}].`,
    `Performance: ${input.completionRate.toFixed(0)}% completion, avg difficulty ${input.avgDifficulty.toFixed(1)}/5. Status: ${input.status}${trend}.`,
    `Skips: ${skipDetail}. Consecutive skip streak: ${input.consecutiveSkips}.`,
    `Task types completed: ${taskBreakdown || 'none'}.`,
    struggling,
    mastering,
    `Recalibration action: ${input.recalibrationAction}`,
  ].filter(Boolean).join(' ');
}

/**
 * Embed and store a behavioral sprint summary.
 * Non-blocking — call with .catch(() => {}) from useCheckpoint.
 */
export async function embedBehavioralSprint(input: SprintBehaviorInput): Promise<void> {
  const jinaKey = env.JINA_API_KEY;
  if (!jinaKey) return;

  const content = composeBehaviorNarrative(input);
  const embedding = await embedQuery(content, jinaKey);
  if (embedding.length === 0) return;

  const metadata: Record<string, unknown> = {
    domain:           input.domain,
    phase:            input.phase,
    primaryStone:     input.stoneProfile.stoneProfile.primaryStone,
    stones:           input.stoneProfile.stoneProfile.stones.map(s => s.type),
    completionRate:   input.completionRate,
    avgDifficulty:    input.avgDifficulty,
    status:           input.status,
    previousStatus:   input.previousStatus,
    weekRange:        input.weekRange,
    taskTypeBreakdown: input.taskTypeBreakdown,
    strugglingAreas:  input.strugglingAreas,
    masteringAreas:   input.masteringAreas,
    sprintNumber:     input.sprintNumber,
    source:           'behavioral',
  };

  await saveSprintMemoryRow(
    input.userId,
    input.goalId,
    input.sprintNumber,
    content,
    embedding,
    metadata,
  );
}

export type { SprintBehaviorInput };
