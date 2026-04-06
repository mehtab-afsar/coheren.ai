import { useEffect } from 'react';
import { useStore } from '@core/store/useStore';
import { flags } from '@config/feature-flags';

function daysBetween(a: string, b: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

/**
 * Automatically advances the roadmap day when the calendar day changes.
 * - If the user returns the next calendar day and completed all tasks, advances normally.
 * - If multiple days were missed, still advances and marks them as missed.
 * This removes the need to manually click "Start Day X".
 */
function maybePregenerateNext() {
  if (!flags.BACKGROUND_TASK_PREGENERATION && !flags.PREGENERATE_TASKS) return;
  const store = useStore.getState();
  const nextDay = store.currentDay + 1;
  // Fire-and-forget — never awaited
  store.pregenerateTasksForDay(nextDay).catch(() => { /* silent */ });
}

export function useAutoAdvance() {
  const { canAdvanceDay, advanceDay } = useStore();

  useEffect(() => {
    const STORAGE_KEY = 'coheren_last_active_date';
    const today = new Date().toISOString().split('T')[0];
    const lastActiveDate = localStorage.getItem(STORAGE_KEY);

    if (lastActiveDate && lastActiveDate !== today) {
      const missed = daysBetween(lastActiveDate, today);
      if (missed >= 1 && canAdvanceDay()) {
        advanceDay();
        maybePregenerateNext();
      }
    }

    localStorage.setItem(STORAGE_KEY, today);

    // Also check when the tab becomes visible again (user returns)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const nowDate = new Date().toISOString().split('T')[0];
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && stored !== nowDate) {
          if (canAdvanceDay()) {
            advanceDay();
            maybePregenerateNext();
          }
          localStorage.setItem(STORAGE_KEY, nowDate);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
