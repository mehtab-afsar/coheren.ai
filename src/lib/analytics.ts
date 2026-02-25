/**
 * Analytics — thin PostHog wrapper.
 *
 * Only activates when VITE_POSTHOG_KEY is set, so dev builds stay silent.
 * Import `analytics` anywhere and call track() — no PostHog SDK boilerplate
 * scattered through the codebase.
 */
import posthog from 'posthog-js';
import { env } from '@config/env';

let initialized = false;

export function initAnalytics() {
  if (!env.POSTHOG_KEY || initialized) return;
  posthog.init(env.POSTHOG_KEY, {
    api_host: env.POSTHOG_HOST,
    capture_pageview: false,   // we fire our own view events
    persistence: 'localStorage',
    autocapture: false,        // explicit events only
  });
  initialized = true;
}

// ── Event catalogue ───────────────────────────────────────────────────────────
export type AnalyticsEvent =
  | { event: 'onboarding_completed'; properties?: { goal_category?: string } }
  | { event: 'task_completed'; properties: { task_id: string; task_type?: string; day: number } }
  | { event: 'task_skipped'; properties: { task_id: string; reason: string; day: number } }
  | { event: 'task_feedback_submitted'; properties: { task_id: string; difficulty: number } }
  | { event: 'checkpoint_completed'; properties: { day: number; completed_tasks: number; avg_difficulty: number } }
  | { event: 'checkpoint_dropped'; properties: { day: number } }
  | { event: 'view_changed'; properties: { view: string } };

export function track({ event, properties }: AnalyticsEvent) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.identify(userId, traits);
}

export function resetAnalyticsUser() {
  if (!initialized) return;
  posthog.reset();
}
