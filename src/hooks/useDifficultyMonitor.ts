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

export function useDifficultyMonitor() {
  const tasks = useStore(s => s.tasks);
  const currentDay = useStore(s => s.currentDay);
  const streak = useStore(s => s.streak);

  const { shouldPrompt, shouldTriggerEarlyRecalibration, triggerResult } = useMemo(() => {
    const lastPromptDay = parseInt(localStorage.getItem(COOLDOWN_KEY) || '0', 10);
    const lastRecalDay = parseInt(localStorage.getItem(EARLY_RECAL_KEY) || '0', 10);
    const inPromptCooldown = currentDay - lastPromptDay < COOLDOWN_DAYS;
    const inRecalCooldown = currentDay - lastRecalDay < COOLDOWN_DAYS;

    const recent = [...tasks]
      .filter(t => t.day < currentDay && (t.completed || t.skipped))
      .sort((a, b) => b.day - a.day)
      .slice(0, WINDOW);

    if (recent.length < 3) {
      return {
        shouldPrompt: false,
        shouldTriggerEarlyRecalibration: false,
        triggerResult: null as TriggerResult | null,
      };
    }

    // Difficulty-based prompt (existing logic)
    const hardSkips = recent.filter(t => t.skipped && t.skipReason === 'difficulty').length;
    const lowMoods = recent.filter(t => (t as unknown as Record<string, unknown>).mood != null && Number((t as unknown as Record<string, unknown>).mood) <= 2).length;
    const prompt = !inPromptCooldown && (hardSkips >= HARD_SKIP_THRESHOLD || lowMoods >= LOW_MOOD_THRESHOLD);

    // Use evaluateTriggers() for consecutive-skip detection (replaces ad-hoc logic)
    const completedCount = recent.filter(t => !t.skipped).length;
    const completionRate = recent.length > 0 ? (completedCount / recent.length) * 100 : 0;
    const trigger = flags.EVENT_DRIVEN_RECALIBRATION
      ? evaluateTriggers(recent, streak, completionRate)
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
  }, [tasks, currentDay, streak]);

  const dismiss = () => {
    localStorage.setItem(COOLDOWN_KEY, String(currentDay));
  };

  const dismissEarlyRecalibration = () => {
    localStorage.setItem(EARLY_RECAL_KEY, String(currentDay));
  };

  return { shouldPrompt, shouldTriggerEarlyRecalibration, triggerResult, dismiss, dismissEarlyRecalibration };
}
