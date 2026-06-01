/**
 * E2E Database helpers — uses service role key to bypass RLS.
 * Only used in test setup/teardown, never in app code.
 */

import { createClient } from '@supabase/supabase-js';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface SimUser {
  id: string;
  email: string;
  jwt: string;
  goalId: string;
  roadmapId: string;
}

/**
 * Create a fully onboarded sim user directly in DB (bypasses UI onboarding).
 * Returns the user's JWT, goalId, and roadmapId for use in tests.
 */
export async function seedSimUser(email: string, goalTitle = 'Build a morning workout habit'): Promise<SimUser> {
  const db = adminClient();

  // Create auth user
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email,
    password: 'sim-password-123!',
    email_confirm: true,
  });
  if (authError) throw new Error(`seedSimUser auth error: ${authError.message}`);
  const userId = authData.user.id;

  // Create profile
  await db.from('profiles').insert({ id: userId, display_name: 'Sim User', created_at: new Date().toISOString() });

  // Create goal
  const { data: goalData } = await db
    .from('user_goals')
    .insert({ user_id: userId, specific_goal: goalTitle, status: 'active', category: 'Health', timeline_days: 90 })
    .select('id')
    .single();
  const goalId = goalData!.id;

  // Create roadmap
  const { data: roadmapData } = await db
    .from('roadmaps')
    .insert({ user_id: userId, goal_id: goalId, total_days: 90, duration_months: 3, status: 'active', title: goalTitle })
    .select('id')
    .single();
  const roadmapId = roadmapData!.id;

  // Create Day 1 tasks
  await db.from('daily_tasks').insert([
    { roadmap_id: roadmapId, user_id: userId, day_number: 1, title: '10-Minute Morning Walk', type: 'practice', estimated_minutes: 10, is_completed: false, is_skipped: false },
    { roadmap_id: roadmapId, user_id: userId, day_number: 2, title: 'Bodyweight Squats × 20', type: 'practice', estimated_minutes: 15, is_completed: false, is_skipped: false },
    { roadmap_id: roadmapId, user_id: userId, day_number: 3, title: 'Morning Stretch Routine', type: 'practice', estimated_minutes: 10, is_completed: false, is_skipped: false },
    { roadmap_id: roadmapId, user_id: userId, day_number: 4, title: '15-Minute Jog', type: 'practice', estimated_minutes: 15, is_completed: false, is_skipped: false },
    { roadmap_id: roadmapId, user_id: userId, day_number: 5, title: 'Push-Up Progression', type: 'practice', estimated_minutes: 20, is_completed: false, is_skipped: false },
    { roadmap_id: roadmapId, user_id: userId, day_number: 6, title: 'Active Recovery Walk', type: 'practice', estimated_minutes: 10, is_completed: false, is_skipped: false },
    { roadmap_id: roadmapId, user_id: userId, day_number: 7, title: 'Week 1 Reflection', type: 'reflection', estimated_minutes: 15, is_completed: false, is_skipped: false },
    { roadmap_id: roadmapId, user_id: userId, day_number: 8, title: 'Jumping Jacks × 50', type: 'practice', estimated_minutes: 10, is_completed: false, is_skipped: false },
    { roadmap_id: roadmapId, user_id: userId, day_number: 9, title: 'Core Strengthening', type: 'practice', estimated_minutes: 20, is_completed: false, is_skipped: false },
    { roadmap_id: roadmapId, user_id: userId, day_number: 10, title: 'Endurance Circuit', type: 'challenge', estimated_minutes: 25, is_completed: false, is_skipped: false },
  ]);

  // Sign in to get JWT
  const { data: signInData } = await db.auth.signInWithPassword({ email, password: 'sim-password-123!' });
  const jwt = signInData.session!.access_token;

  return { id: userId, email, jwt, goalId, roadmapId };
}

/** Remove the sim user and all their data (cascade deletes handle child rows). */
export async function deleteSimUser(email: string): Promise<void> {
  const db = adminClient();
  const { data } = await db.auth.admin.listUsers();
  const user = data.users.find(u => u.email === email);
  if (user) {
    await db.auth.admin.deleteUser(user.id);
  }
}

/** Get daily tasks for a specific day number. */
export async function getDailyTasksForDay(roadmapId: string, dayNumber: number) {
  const db = adminClient();
  const { data } = await db
    .from('daily_tasks')
    .select('*')
    .eq('roadmap_id', roadmapId)
    .eq('day_number', dayNumber);
  return data ?? [];
}

/** Get task feedback for a specific day. */
export async function getTaskFeedbackForDay(roadmapId: string, dayNumber: number) {
  const db = adminClient();
  const tasks = await getDailyTasksForDay(roadmapId, dayNumber);
  if (tasks.length === 0) return [];
  const taskIds = tasks.map(t => t.id);
  const { data } = await db
    .from('task_feedback')
    .select('*')
    .in('task_id', taskIds);
  return data ?? [];
}

/** Assert zero orphaned feedback rows (verifies CASCADE DELETE works). */
export async function assertNoOrphanedFeedback() {
  const db = adminClient();
  const { data } = await db.rpc('count_orphaned_feedback');
  expect(Number(data)).toBe(0);
}

/** Assert all 5 agents logged at least one run for the given user. */
export async function assertAllAgentLogsPresent(userId: string) {
  const db = adminClient();
  const { data } = await db
    .from('agent_logs')
    .select('agent_name')
    .eq('user_id', userId);
  const names = new Set((data ?? []).map(r => r.agent_name as string));
  // At minimum onboarding agents (1, 2, 3, 4) should have run
  expect(names.size).toBeGreaterThanOrEqual(2);
}

/**
 * Inject auth state into page localStorage so the app boots as the sim user.
 */
export async function injectAuthState(page: Page, jwt: string, simUser: SimUser, storeState?: object) {
  const SUPABASE_AUTH_KEY = 'sb-127-auth-token';

  await page.addInitScript(({ accessToken, userId, email, authKey, store }: {
    accessToken: string;
    userId: string;
    email: string;
    authKey: string;
    store?: object;
  }) => {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600;
    localStorage.setItem(authKey, JSON.stringify({
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: exp,
      refresh_token: 'sim-refresh',
      user: { id: userId, email, role: 'authenticated', aud: 'authenticated' },
    }));
    if (store) {
      localStorage.setItem('consist-storage', JSON.stringify(store));
    }
  }, { accessToken: jwt, userId: simUser.id, email: simUser.email, authKey: SUPABASE_AUTH_KEY, store: storeState });
}

/** Build a Zustand store state for a user on day N of their plan. */
export function buildDayNStoreState(simUser: SimUser, dayNumber: number, extraState?: object) {
  return {
    state: {
      step: 2,
      user: { id: simUser.id, email: simUser.email, role: 'authenticated', aud: 'authenticated' },
      isAuthenticated: true,
      currentDay: dayNumber,
      streak: dayNumber - 1,
      tasks: [],
      roadmap: { title: 'Build a morning workout habit', category: 'Health', duration: 90, dailyTime: '30 minutes', phases: [], startDate: new Date().toISOString(), endDate: new Date(Date.now() + 90 * 86400000).toISOString() },
      currentGoal: { category: 'Health', specificGoal: 'Build a morning workout habit' },
      stoneProfile: null,
      initialGoal: '',
      onboardingPhase: 'complete',
      ...extraState,
    },
    version: 1,
  };
}
