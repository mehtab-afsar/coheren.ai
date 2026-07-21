import { useMemo } from 'react';
import { useStore } from '@core/store/useStore';
import { evaluateTriggers } from '@lib/recalibrationTrigger';
import type { TriggerResult } from '@lib/recalibrationTrigger';
import { flags } from '@config/feature-flags';

const HARD_SKIP_THRESHOLD = 3;
const LOW_MOOD_THRESHOLD = 4;
const WINDOW = 5;
const COOLDOWN_KEY = 'difficulty_prompted_day';
const EARLY_RECAL_KEY = 'early_recal_day';
const COOLDOWN_DAYS = 7;

export type { TriggerResult };

/** Minimal shape of a task the difficulty signal reads (structural subset of the store Task). */
export interface DifficultyTask {
  day: number;
  completed?: boolean;
  skipped?: boolean;
  skipReason?: string;
  mood?: number;
}

export interface DifficultySignalInput {
  tasks: DifficultyTask[];
  currentDay: number;
  streak: number;
  /** currentDay - lastPromptDay < COOLDOWN_DAYS (caller reads localStorage). */
  inPromptCooldown: boolean;
  /** currentDay - lastRecalDay < COOLDOWN_DAYS. */
  inRecalCooldown: boolean;
  /** flags.EVENT_DRIVEN_RECALIBRATION — passed in so the function stays pure/testable. */
  eventDriven: boolean;
}

export interface DifficultySignal {
  shouldPrompt: boolean;
  shouldTriggerEarlyRecalibration: boolean;
  triggerResult: TriggerResult | null;
}

/**
 * Pure difficulty-signal computation extracted from useDifficultyMonitor so it can be
 * unit-tested against the REAL logic (no React, no localStorage, no global flags).
 * The hook is a thin wrapper that supplies cooldown/flag inputs from the environment.
 */
export function computeDifficultySignal(input: DifficultySignalInput): DifficultySignal {
  const { tasks, currentDay, streak, inPromptCooldown, inRecalCooldown, eventDriven } = input;

  const recent = [...tasks]
    .filter(t => t.day < currentDay && (t.completed || t.skipped))
    .sort((a, b) => b.day - a.day)
    .slice(0, WINDOW);

  if (recent.length < 3) {
    return { shouldPrompt: false, shouldTriggerEarlyRecalibration: false, triggerResult: null };
  }

  // Difficulty-based prompt (existing logic)
  const hardSkips = recent.filter(t => t.skipped && t.skipReason === 'difficulty').length;
  const lowMoods = recent.filter(t => t.mood != null && Number(t.mood) <= 2).length;
  const prompt = !inPromptCooldown && (hardSkips >= HARD_SKIP_THRESHOLD || lowMoods >= LOW_MOOD_THRESHOLD);

  // Use evaluateTriggers() for consecutive-skip detection (replaces ad-hoc logic)
  const completedCount = recent.filter(t => !t.skipped).length;
  const completionRate = recent.length > 0 ? (completedCount / recent.length) * 100 : 0;
  const trigger = eventDriven
    // `recent` is a structural subset (DifficultyTask); evaluateTriggers only runs
    // when eventDriven is on, and the hook passes real store Tasks in that case.
    ? evaluateTriggers(recent as unknown as Parameters<typeof evaluateTriggers>[0], streak, completionRate)
    : (() => {
        // Fallback: replicate original consecutive-skip logic
        let consecutiveSkips = 0;
        for (const t of recent) {
          if (t.skipped) consecutiveSkips++;
          else break;
        }
        if (!inRecalCooldown && consecutiveSkips >= 3) {
          return {
            triggered: true,
            type: 'dropout_risk' as const,
            action: 'decrease_difficulty' as const,
            magnitude: 0.2 as const,
            reasoning: `${consecutiveSkips} consecutive skips`,
          };
        }
        return null;
      })();

  const earlyRecal = trigger?.triggered && !inRecalCooldown;

  return {
    shouldPrompt: prompt,
    shouldTriggerEarlyRecalibration: earlyRecal ?? false,
    triggerResult: trigger,
  };
}

export function useDifficultyMonitor() {
  const tasks = useStore(s => s.tasks);
  const currentDay = useStore(s => s.currentDay);
  const streak = useStore(s => s.streak);

  const { shouldPrompt, shouldTriggerEarlyRecalibration, triggerResult } = useMemo(() => {
    const lastPromptDay = parseInt(localStorage.getItem(COOLDOWN_KEY) || '0', 10);
    const lastRecalDay = parseInt(localStorage.getItem(EARLY_RECAL_KEY) || '0', 10);
    return computeDifficultySignal({
      tasks: tasks as unknown as DifficultyTask[],
      currentDay,
      streak,
      inPromptCooldown: currentDay - lastPromptDay < COOLDOWN_DAYS,
      inRecalCooldown: currentDay - lastRecalDay < COOLDOWN_DAYS,
      eventDriven: flags.EVENT_DRIVEN_RECALIBRATION,
    });
  }, [tasks, currentDay, streak]);

  const dismiss = () => {
    localStorage.setItem(COOLDOWN_KEY, String(currentDay));
  };

  const dismissEarlyRecalibration = () => {
    localStorage.setItem(EARLY_RECAL_KEY, String(currentDay));
  };

  return { shouldPrompt, shouldTriggerEarlyRecalibration, triggerResult, dismiss, dismissEarlyRecalibration };
}
