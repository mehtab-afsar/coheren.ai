/**
 * Web Push subscription (client side).
 *
 * Real re-engagement requires the app to notify a user who has CLOSED it — which
 * in-page setTimeout cannot do. This registers a Push subscription (VAPID) and
 * stores it in Supabase so a scheduled edge function (`send-reminders`) can push
 * the daily task even when the tab/PWA is closed.
 *
 * Setup: generate a VAPID keypair (`npx web-push generate-vapid-keys`), set the
 * public key as `VITE_VAPID_PUBLIC_KEY` (client) and the private key as an edge
 * secret. Without the public key, push is disabled gracefully.
 */

import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim() ?? '';

export function isPushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

/** True only when the browser supports push AND a VAPID public key is configured. */
export function isPushConfigured(): boolean {
  return isPushSupported() && VAPID_PUBLIC_KEY.length > 0;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  // Back with an explicit ArrayBuffer so the result is a valid BufferSource
  // (Uint8Array<ArrayBufferLike> is rejected by applicationServerKey under TS 5.7).
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Request notification permission and register a push subscription, persisting it
 * to Supabase. Returns true on success. Safe to call repeatedly (idempotent upsert).
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushConfigured()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return false;

  const json = sub.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
    },
    { onConflict: 'endpoint' },
  );
  return !error;
}

/** Remove the local push subscription and delete it from Supabase. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe().catch(() => {});
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
}
