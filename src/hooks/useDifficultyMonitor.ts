import { useMemo } from 'react';
import { useStore } from '@core/store/useStore';

const HARD_SKIP_THRESHOLD = 3;
const LOW_MOOD_THRESHOLD = 4;
const CONSECUTIVE_SKIP_THRESHOLD = 3;
const WINDOW = 5;
const COOLDOWN_KEY = 'difficulty_prompted_day';
const EARLY_RECAL_KEY = 'early_recal_day';
const COOLDOWN_DAYS = 7;

export function useDifficultyMonitor() {
  const tasks = useStore(s => s.tasks);
  const currentDay = useStore(s => s.currentDay);

  const { shouldPrompt, shouldTriggerEarlyRecalibration } = useMemo(() => {
    const lastPromptDay = parseInt(localStorage.getItem(COOLDOWN_KEY) || '0', 10);
    const lastRecalDay = parseInt(localStorage.getItem(EARLY_RECAL_KEY) || '0', 10);
    const inPromptCooldown = currentDay - lastPromptDay < COOLDOWN_DAYS;
    const inRecalCooldown = currentDay - lastRecalDay < COOLDOWN_DAYS;

    const recent = [...tasks]
      .filter(t => t.day < currentDay && (t.completed || t.skipped))
      .sort((a, b) => b.day - a.day)
      .slice(0, WINDOW);

    if (recent.length < 3) {
      return { shouldPrompt: false, shouldTriggerEarlyRecalibration: false };
    }

    // Difficulty-based prompt (existing logic)
    const hardSkips = recent.filter(t => t.skipped && t.skipReason === 'difficulty').length;
    const lowMoods = recent.filter(t => (t as Record<string, unknown>).mood != null && Number((t as Record<string, unknown>).mood) <= 2).length;
    const prompt = !inPromptCooldown && (hardSkips >= HARD_SKIP_THRESHOLD || lowMoods >= LOW_MOOD_THRESHOLD);

    // Consecutive skip detection — 3+ skips in a row triggers early recalibration
    let consecutiveSkips = 0;
    for (const t of recent) {
      if (t.skipped) consecutiveSkips++;
      else break; // stop counting at first non-skip
    }
    const earlyRecal = !inRecalCooldown && consecutiveSkips >= CONSECUTIVE_SKIP_THRESHOLD;

    return { shouldPrompt: prompt, shouldTriggerEarlyRecalibration: earlyRecal };
  }, [tasks, currentDay]);

  const dismiss = () => {
    localStorage.setItem(COOLDOWN_KEY, String(currentDay));
  };

  const dismissEarlyRecalibration = () => {
    localStorage.setItem(EARLY_RECAL_KEY, String(currentDay));
  };

  return { shouldPrompt, shouldTriggerEarlyRecalibration, dismiss, dismissEarlyRecalibration };
}
