import type { Page } from '@playwright/test';

// Supabase auth localStorage key for http://127.0.0.1:54321
const SUPABASE_AUTH_KEY = 'sb-127-auth-token';

const TEST_USER = {
  id: 'test-user-id',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@coheren.dev',
  email_confirmed_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export const DASHBOARD_STORE_STATE = {
  state: {
    step: 2,
    user: TEST_USER,
    isAuthenticated: true,
    currentDay: 1,
    streak: 3,
    tasks: [
      {
        id: 'task-1',
        title: 'Morning meditation',
        description: 'Start your day with 5 minutes of mindfulness.',
        type: 'practice',
        duration: 20,
        completed: false,
        skipped: false,
        scheduledFor: '08:00',
        day: 1,
        dayNumber: 1,
        steps: ['Find a quiet space', 'Close your eyes', 'Focus on your breath'],
        tips: ['Even 2 minutes counts'],
        successCriteria: 'Completed without distraction',
      },
      {
        id: 'task-2',
        title: 'Read 10 pages',
        description: 'Read from your chosen learning material.',
        type: 'learning',
        duration: 30,
        completed: true,
        completedAt: new Date().toISOString(),
        skipped: false,
        scheduledFor: '20:00',
        day: 1,
        dayNumber: 1,
        steps: [],
        tips: [],
        successCriteria: '10 pages read',
      },
    ],
    roadmap: {
      title: 'Build a daily meditation habit',
      category: 'Habit',
      duration: 90,
      dailyTime: '30 minutes',
      phases: [{ title: 'Foundation', weeks: '1-4', description: 'Build the habit' }],
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 90 * 86400000).toISOString(),
    },
    currentGoal: { category: 'Habit', specificGoal: 'Meditate every morning' },
    stoneProfile: null,
    initialGoal: '',
    onboardingPhase: 'complete',
  },
  version: 0,
};

/**
 * Seeds both localStorage stores before the app boots and mocks all Supabase
 * network calls so no running DB is required.
 *
 * Auth flow:
 *  1. addInitScript → Zustand has step=2+tasks, Supabase has a fake session
 *  2. App boots → spinner while checkAuth() runs
 *  3. /auth/v1/user mocked → returns user → setAuthInitialized(true)
 *  4. onAuthStateChange fires with INITIAL_SESSION + user
 *  5. liveStep===2 && liveTasks.length>0 → early return, no reset
 *  6. Dashboard renders
 */
export async function seedDashboard(page: Page) {
  await page.addInitScript(({ storeState, supabaseKey, testUser }: {
    storeState: typeof DASHBOARD_STORE_STATE;
    supabaseKey: string;
    testUser: typeof TEST_USER;
  }) => {
    localStorage.setItem('consist-storage', JSON.stringify(storeState));

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600;
    const b64url = (obj: object) =>
      btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const accessToken = [
      b64url({ alg: 'HS256', typ: 'JWT' }),
      b64url({ sub: testUser.id, email: testUser.email, role: 'authenticated', aud: 'authenticated', exp, iat: now }),
      'e2e-test-sig',
    ].join('.');
    localStorage.setItem(supabaseKey, JSON.stringify({
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: exp,
      refresh_token: 'e2e-refresh',
      user: testUser,
    }));
  }, { storeState: DASHBOARD_STORE_STATE, supabaseKey: SUPABASE_AUTH_KEY, testUser: TEST_USER });

  await page.route('**/auth/v1/user', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TEST_USER) })
  );
  await page.route('**/auth/v1/token**', (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ access_token: 'e2e-token', refresh_token: 'e2e-refresh', expires_in: 3600, token_type: 'bearer', user: TEST_USER }),
    })
  );
  await page.route('**/rest/v1/user_goals**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
  await page.route('**/rest/v1/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
  await page.route('**/realtime/v1/**', (route) => route.abort());

  await page.goto('/');

  // Wait until the store still has step=2 (auth listener didn't reset it)
  await page.waitForFunction(() => {
    try {
      const raw = localStorage.getItem('consist-storage');
      return raw ? JSON.parse(raw).state?.step === 2 : false;
    } catch { return false; }
  }, { timeout: 12000 });
}
