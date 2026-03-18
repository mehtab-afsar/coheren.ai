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
  // Guard against placeholder values left in .env.production template
  if (!env.POSTHOG_KEY || env.POSTHOG_KEY.includes('your-posthog-key') || initialized) return;
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
  // Core task events
  | { event: 'onboarding_completed'; properties?: { goal_category?: string } }
  | { event: 'task_completed'; properties: { task_id: string; task_type?: string; day: number } }
  | { event: 'task_skipped'; properties: { task_id: string; reason: string; day: number } }
  | { event: 'task_feedback_submitted'; properties: { task_id: string; difficulty: number } }
  | { event: 'checkpoint_completed'; properties: { day: number; completed_tasks: number; avg_difficulty: number } }
  | { event: 'checkpoint_dropped'; properties: { day: number } }
  | { event: 'view_changed'; properties: { view: string } }
  // Focus session
  | { event: 'focus_session_started'; properties: { task_id: string; task_type?: string; day: number } }
  | { event: 'focus_session_completed'; properties: { task_id: string; duration_seconds: number; has_notes: boolean } }
  | { event: 'focus_session_abandoned'; properties: { task_id: string; duration_seconds: number; reason?: string } }
  // Difficulty feedback loop
  | { event: 'difficulty_prompt_shown'; properties: { trigger: 'hard_skips' | 'low_moods'; count: number } }
  | { event: 'difficulty_choice_made'; properties: { choice: 'simplify' | 'extend' | 'keep' } }
  // Sharing & milestones
  | { event: 'milestone_shared'; properties: { platform: 'native' | 'download'; streak: number; tasks_done: number } }
  | { event: 'streak_warning_shown'; properties: { current_streak: number } }
  // Notifications & permissions
  | { event: 'notification_permission'; properties: { granted: boolean } }
  // Plan adjustments
  | { event: 'plan_adjustment_shown'; properties: { adjustment_type: 'simplify' | 'extend' } }
  // Onboarding steps
  | { event: 'onboarding_step_completed'; properties: { step: number; total: number } }
  // Summaries & coach insights
  | { event: 'weekly_summary_viewed'; properties: { week_number: number; completion_pct: number } }
  | { event: 'coach_insight_shown'; properties: { insight_type: string } }
  // Offline
  | { event: 'offline_action_queued'; properties: { action_type: string } }
  // Tab engagement
  | { event: 'tab_time_spent'; properties: { tab: string; seconds: number } }
  // Recalibration
  | { event: 'early_recalibration_triggered'; properties: { day: number; mode: string; skipped_tasks: number } };

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
