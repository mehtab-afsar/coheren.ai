// Push notification utility for CONSIST

export interface NotificationPermissionState {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

/**
 * Check if notifications are supported by the browser
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Get current notification permission state
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) {
    return { granted: false, denied: true, prompt: false };
  }

  const permission = Notification.permission;
  return {
    granted: permission === 'granted',
    denied: permission === 'denied',
    prompt: permission === 'default'
  };
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Show a notification
 */
export function showNotification(title: string, options?: NotificationOptions): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    console.warn('Cannot show notification: permission not granted');
    return;
  }

  const defaultOptions: NotificationOptions = {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    requireInteraction: false,
    ...options
  };

  try {
    const notification = new Notification(title, defaultOptions);

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}

/**
 * Schedule a daily check-in reminder
 * Note: Browser-based notifications don't have true scheduling.
 * This calculates the delay until the next check-in time.
 */
export function scheduleDailyCheckIn(checkInTime: string): void {
  // Cancel any existing scheduled notification
  clearScheduledNotifications();

  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  const scheduleNextNotification = () => {
    const now = new Date();
    const [hours, minutes] = checkInTime.split(':').map(Number);

    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const delay = scheduledTime.getTime() - now.getTime();

    const timeoutId = setTimeout(() => {
      showNotification('Time to check in!', {
        body: "Let's build your habit. Your daily tasks are waiting!",
        tag: 'daily-checkin',
        data: { url: '/' }
      });

      // Schedule the next notification for tomorrow
      scheduleNextNotification();
    }, delay);

    // Store timeout ID for cleanup
    if (typeof window !== 'undefined') {
      (window as any).__consistNotificationTimeout = timeoutId;
    }
  };

  scheduleNextNotification();
}

/**
 * Clear all scheduled notifications
 */
export function clearScheduledNotifications(): void {
  if (typeof window !== 'undefined' && (window as any).__consistNotificationTimeout) {
    clearTimeout((window as any).__consistNotificationTimeout);
    delete (window as any).__consistNotificationTimeout;
  }
}

/**
 * Initialize notifications system
 */
export async function initializeNotifications(checkInTime: string): Promise<boolean> {
  const hasPermission = await requestNotificationPermission();

  if (hasPermission) {
    scheduleDailyCheckIn(checkInTime);
  }

  return hasPermission;
}
