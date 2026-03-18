export interface AppNotification {
  id: string;
  type: 'plan_adjustment' | 'milestone' | 'weekly_summary' | 'coach_insight' | 'system';
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

const STORAGE_KEY = 'app_notifications';

export function getNotifications(): AppNotification[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addNotification(n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) {
  const existing = getNotifications();
  const newN: AppNotification = {
    ...n,
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    read: false,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([newN, ...existing].slice(0, 50)));
}
