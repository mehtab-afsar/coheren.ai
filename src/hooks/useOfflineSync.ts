import { useState, useEffect, useCallback } from 'react';

const QUEUE_KEY = 'offline_queue';

interface PendingAction {
  type: string;
  payload: unknown;
  timestamp: number;
}

function loadQueue(): PendingAction[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQueue(q: PendingAction[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [pendingCount, setPendingCount] = useState(() => loadQueue().length);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      const queue = loadQueue();
      if (queue.length > 0) {
        window.dispatchEvent(new CustomEvent('offline-sync-flush', { detail: queue }));
        saveQueue([]);
        setPendingCount(0);
      }
    };

    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const queueAction = useCallback((type: string, payload: unknown) => {
    const queue = loadQueue();
    queue.push({ type, payload, timestamp: Date.now() });
    saveQueue(queue);
    setPendingCount(queue.length);
  }, []);

  return { isOnline, queueAction, pendingCount };
}
