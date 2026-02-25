/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Open / focus the app when a notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow('/');
      }),
  );
});

// Handle server-sent push events (future use with VAPID)
self.addEventListener('push', (event) => {
  const data = event.data?.json() as { title?: string; body?: string } ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Coheren', {
      body: data.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    }),
  );
});

// Allow the app to request a notification via postMessage
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = event.data as { type: string; title: string; body: string; tag?: string };
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag,
    });
  }
});
