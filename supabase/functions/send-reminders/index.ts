// send-reminders — scheduled web-push sender (Supabase Edge Function, Deno).
//
// Delivers the daily task as a push notification even when the app is closed —
// the core of the re-engagement loop. Intended to run on a cron schedule (e.g.
// hourly) and notify users whose local check-in time matches the current hour.
//
// Secrets required (supabase secrets set …):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@domain)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (provided by the platform)
//
// Schedule (supabase/config.toml or dashboard): a cron trigger, e.g. "0 * * * *".

import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const DAY_MS = 86_400_000;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@coheren.ai';

  if (!vapidPublic || !vapidPrivate) return json(500, { error: 'VAPID keys not configured' });
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const admin = createClient(supabaseUrl, serviceKey);

  // All push subscriptions, joined to the subscriber's active goal + roadmap.
  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth');
  if (error) return json(500, { error: error.message });
  if (!subs || subs.length === 0) return json(200, { sent: 0, note: 'no subscriptions' });

  let sent = 0, pruned = 0;

  for (const sub of subs) {
    // Resolve the subscriber's current-day task title + daily minutes.
    const { data: goal } = await admin
      .from('user_goals')
      .select('id, title, roadmaps(id, config, created_at)')
      .eq('user_id', sub.user_id)
      .eq('status', 'active')
      .maybeSingle();

    // The embedded `roadmaps` relation comes back as an array (a goal may have
    // several roadmaps); take the most-recent-shaped first entry.
    const roadmapsRel = (goal as { roadmaps?: { id: string; config?: Record<string, unknown>; created_at?: string }[] | { id: string; config?: Record<string, unknown>; created_at?: string } } | null)?.roadmaps;
    const roadmap = Array.isArray(roadmapsRel) ? roadmapsRel[0] : roadmapsRel;
    let title = 'Your task for today is ready';
    let body = 'Open Coheren and do the one thing.';
    const url = '/';

    if (roadmap?.id && roadmap.created_at) {
      const startMs = new Date(roadmap.created_at).getTime();
      const currentDay = Math.max(1, Math.floor((Date.now() - startMs) / DAY_MS) + 1);
      const { data: task } = await admin
        .from('daily_tasks')
        .select('title, content')
        .eq('roadmap_id', roadmap.id)
        .eq('day_number', currentDay)
        .maybeSingle();
      if (task?.title) {
        const mins = (task.content as { estimatedMinutes?: number } | null)?.estimatedMinutes;
        title = 'Today: ' + task.title;
        body = mins ? `~${mins} min. Start when you're ready.` : 'Start when you\'re ready.';
      }
    }

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url, tag: 'daily-task' }),
      );
      sent++;
    } catch (e) {
      // 404/410 → subscription is dead; prune it.
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        pruned++;
      }
    }
  }

  return json(200, { sent, pruned, total: subs.length });
});
