const STORAGE_KEY = 'coheren_active_session';

export interface FocusSessionState {
  taskId: string;
  taskTitle: string;
  startedAt: string;
  elapsedSeconds: number;
  videoPosition?: number;
  isPaused: boolean;
}

export function useFocusSession() {
  const getSession = (): FocusSessionState | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as FocusSessionState;
    } catch {
      return null;
    }
  };

  const startSession = (taskId: string, taskTitle: string): void => {
    const session: FocusSessionState = {
      taskId,
      taskTitle,
      startedAt: new Date().toISOString(),
      elapsedSeconds: 0,
      isPaused: false,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch { /* ignore */ }
  };

  const updateElapsed = (seconds: number): void => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const session: FocusSessionState = JSON.parse(raw);
      session.elapsedSeconds = seconds;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch { /* ignore */ }
  };

  const updateVideoPosition = (seconds: number): void => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const session: FocusSessionState = JSON.parse(raw);
      session.videoPosition = seconds;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch { /* ignore */ }
  };

  const endSession = (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  };

  const formatElapsed = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0 && s > 0) return `${m}m ${s}s`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  };

  return {
    startSession,
    updateElapsed,
    updateVideoPosition,
    endSession,
    getSession,
    formatElapsed,
  };
}
