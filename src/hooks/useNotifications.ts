import { useEffect, useRef } from 'react';
import { useStore } from '@core/store/useStore';

const MORNING_HOUR = 9;  // 9 AM
const EVENING_HOUR = 20; // 8 PM

/** ms until the next occurrence of `hour:00:00` (same day or tomorrow) */
function msUntil(hour: number): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

/** Storage key scoped to today so notifications re-schedule each day */
function dayKey(type: 'morning' | 'evening'): string {
  return `notif-scheduled-${type}-${new Date().toISOString().split('T')[0]}`;
}

async function showViaServiceWorker(title: string, body: string, tag: string) {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  // Prefer the SW message path so the notification survives page close
  if (reg.active) {
    reg.active.postMessage({ type: 'SHOW_NOTIFICATION', title, body, tag });
  } else {
    reg.showNotification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png', tag });
  }
}

export function useNotifications() {
  const tasks = useStore((s) => s.tasks);
  // Stable refs so the effect closures always read the latest task list
  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission === 'denied') return;

    let morningTimer: ReturnType<typeof setTimeout> | null = null;
    let eveningTimer: ReturnType<typeof setTimeout> | null = null;

    const setup = async () => {
      // Request permission once — browser will only show the prompt once
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      if (permission !== 'granted') return;

      // ── Morning notification ──────────────────────────────────────────────
      const morningKey = dayKey('morning');
      if (!localStorage.getItem(morningKey)) {
        const delay = msUntil(MORNING_HOUR);
        morningTimer = setTimeout(async () => {
          localStorage.setItem(morningKey, '1');
          const current = tasksRef.current;
          const pending = current.filter((t) => !t.completed);
          const count = pending.length;
          const body =
            count > 0
              ? `You have ${count} task${count !== 1 ? 's' : ''} ready for today. Let's go!`
              : "Your plan is ready. Time to make progress!";
          await showViaServiceWorker('Good morning 👋', body, morningKey);
        }, delay);
      }

      // ── Evening notification ──────────────────────────────────────────────
      const eveningKey = dayKey('evening');
      if (!localStorage.getItem(eveningKey)) {
        const delay = msUntil(EVENING_HOUR);
        eveningTimer = setTimeout(async () => {
          localStorage.setItem(eveningKey, '1');
          const current = tasksRef.current;
          const remaining = current.filter((t) => !t.completed).length;
          if (remaining === 0) return; // all done — no nudge needed
          const body = `${remaining} task${remaining !== 1 ? 's' : ''} still to go today. There's still time!`;
          await showViaServiceWorker('Evening check-in 🌙', body, eveningKey);
        }, delay);
      }
    };

    // Delay the permission ask by 4 s to not interrupt the initial render
    const askTimer = setTimeout(setup, 4000);

    return () => {
      clearTimeout(askTimer);
      if (morningTimer) clearTimeout(morningTimer);
      if (eveningTimer) clearTimeout(eveningTimer);
    };
  }, []); // run once on mount
}
