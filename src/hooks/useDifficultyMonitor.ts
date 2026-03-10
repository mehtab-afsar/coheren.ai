import { useMemo } from 'react';
import { useStore } from '@core/store/useStore';

const HARD_SKIP_THRESHOLD = 3;
const LOW_MOOD_THRESHOLD = 4;
const WINDOW = 5;
const COOLDOWN_KEY = 'difficulty_prompted_day';
const COOLDOWN_DAYS = 7;

export function useDifficultyMonitor() {
  const tasks = useStore(s => s.tasks);
  const currentDay = useStore(s => s.currentDay);

  const shouldPrompt = useMemo(() => {
    const lastDay = parseInt(localStorage.getItem(COOLDOWN_KEY) || '0', 10);
    if (currentDay - lastDay < COOLDOWN_DAYS) return false;

    const recent = [...tasks]
      .filter(t => t.day < currentDay && (t.completed || t.skipped))
      .sort((a, b) => b.day - a.day)
      .slice(0, WINDOW);

    if (recent.length < 3) return false;

    const hardSkips = recent.filter(t => t.skipped && t.skipReason === 'hard').length;
    const lowMoods = recent.filter(t => typeof t.mood === 'number' && t.mood <= 2).length;

    return hardSkips >= HARD_SKIP_THRESHOLD || lowMoods >= LOW_MOOD_THRESHOLD;
  }, [tasks, currentDay]);

  const dismiss = () => {
    localStorage.setItem(COOLDOWN_KEY, String(currentDay));
  };

  return { shouldPrompt, dismiss };
}
