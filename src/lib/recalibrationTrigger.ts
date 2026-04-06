/**
 * Event-Driven Micro-Recalibration Triggers (5.4)
 *
 * Pure rules-based evaluation — no LLM calls by default.
 * Detects four trigger types from recent task data and streak/completion stats:
 *
 *   streak_uplift   — user is on a roll, difficulty can increase
 *   dropout_risk    — user is dropping off, difficulty must decrease
 *   pace_mismatch   — tasks are finishing much faster than estimated (add density)
 *   overload        — user is skipping > 40% for 5 days (strip challenge tasks)
 *
 * Rate-limited per type: each trigger fires at most once per 24 h.
 * Gated behind EVENT_DRIVEN_RECALIBRATION feature flag.
 */

import type { Task } from '@core/store/useStore';

// ─── Public types ──────────────────────────────────────────────────────────────

export type TriggerType = 'streak_uplift' | 'dropout_risk' | 'pace_mismatch' | 'overload';

export interface TriggerResult {
  triggered: boolean;
  type: TriggerType | null;
  action: 'increase_difficulty' | 'decrease_difficulty' | 'increase_density' | 'reduce_count' | null;
  magnitude: 0.1 | 0.2 | 0.3;
  reasoning: string;
}

// ─── Rate-limit helpers ────────────────────────────────────────────────────────

const RATE_LIMIT_MS = 24 * 60 * 60 * 1000; // 24 h
const LS_KEY = (type: TriggerType) => `recal_trigger_${type}_ts`;

function isRateLimited(type: TriggerType): boolean {
  const raw = localStorage.getItem(LS_KEY(type));
  if (!raw) return false;
  return Date.now() - parseInt(raw, 10) < RATE_LIMIT_MS;
}

function markFired(type: TriggerType): void {
  localStorage.setItem(LS_KEY(type), String(Date.now()));
}

// ─── Core evaluation ───────────────────────────────────────────────────────────

const NO_TRIGGER: TriggerResult = {
  triggered: false,
  type: null,
  action: null,
  magnitude: 0.1,
  reasoning: 'No trigger condition met',
};

/**
 * Evaluate micro-recalibration triggers from recent task history.
 *
 * @param recentTasks  Tasks from the last 5–7 days (completed or skipped)
 * @param streak       Current completion streak (days in a row completed)
 * @param completionRate  Recent completion rate as a percentage (0–100)
 */
export function evaluateTriggers(
  recentTasks: Task[],
  streak: number,
  completionRate: number
): TriggerResult {
  // ── streak_uplift: 5+ day streak AND ≥ 85% completion rate ──
  if (streak >= 5 && completionRate >= 85 && !isRateLimited('streak_uplift')) {
    markFired('streak_uplift');
    return {
      triggered: true,
      type: 'streak_uplift',
      action: 'increase_difficulty',
      magnitude: 0.2,
      reasoning: `${streak}-day streak with ${completionRate.toFixed(0)}% completion — user is ready for more challenge`,
    };
  }

  // ── dropout_risk: 3+ consecutive missed/skipped days ──
  const sortedByDay = [...recentTasks].sort((a, b) => b.day - a.day);
  let consecutiveMissed = 0;
  for (const t of sortedByDay) {
    if (t.skipped) consecutiveMissed++;
    else break;
  }
  if (consecutiveMissed >= 3 && !isRateLimited('dropout_risk')) {
    markFired('dropout_risk');
    return {
      triggered: true,
      type: 'dropout_risk',
      action: 'decrease_difficulty',
      magnitude: 0.2,
      reasoning: `${consecutiveMissed} consecutive missed days detected — reduce load and reframe as RECOVER sprint`,
    };
  }

  // ── pace_mismatch: actual duration < 50% of estimated for 3+ days ──
  const completedWithDuration = recentTasks.filter(
    t => !t.skipped && t.actualDuration != null && t.duration > 0
  );
  const fastDays = completedWithDuration.filter(
    t => t.actualDuration! < t.duration * 0.5
  );
  if (fastDays.length >= 3 && !isRateLimited('pace_mismatch')) {
    markFired('pace_mismatch');
    return {
      triggered: true,
      type: 'pace_mismatch',
      action: 'increase_density',
      magnitude: 0.1,
      reasoning: `Tasks completing in < 50% of estimated time for ${fastDays.length} days — add one extra segment`,
    };
  }

  // ── overload: ≥ 40% of tasks skipped for 5 days ──
  if (recentTasks.length >= 5) {
    const window5 = [...recentTasks].sort((a, b) => b.day - a.day).slice(0, 5);
    const skipped5 = window5.filter(t => t.skipped).length;
    if (skipped5 / window5.length >= 0.4 && !isRateLimited('overload')) {
      markFired('overload');
      return {
        triggered: true,
        type: 'overload',
        action: 'reduce_count',
        magnitude: 0.3,
        reasoning: `${skipped5} of last 5 tasks skipped — remove challenge/assessment tasks for next sprint`,
      };
    }
  }

  return NO_TRIGGER;
}

/**
 * Apply a trigger result to tomorrow's task list.
 * Mutates a copy — does NOT update the store directly.
 */
export function applyMicroRecalibration(
  trigger: TriggerResult,
  tomorrowsTasks: Task[]
): Task[] {
  if (!trigger.triggered) return tomorrowsTasks;

  const tasks = [...tomorrowsTasks];

  switch (trigger.action) {
    case 'increase_difficulty':
      return tasks.map(t => ({ ...t, adjustedDifficulty: 'harder' as const }));

    case 'decrease_difficulty':
      return tasks.map(t => ({ ...t, adjustedDifficulty: 'easier' as const }));

    case 'increase_density':
      // Add a brief "bonus" segment note to the description
      return tasks.map(t => ({
        ...t,
        description: t.description + '\n\n**Bonus:** If time allows, repeat the main exercise for an extra 10 minutes.',
      }));

    case 'reduce_count':
      // Remove challenge and assessment tasks; keep practice + learning
      return tasks.filter(t => t.type !== 'challenge' && t.type !== 'assessment');

    default:
      return tasks;
  }
}
