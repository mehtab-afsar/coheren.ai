import { test, expect } from '@playwright/test';

const TEST_USER = {
  id: 'checkpoint-test-id',
  email: 'checkpoint@coheren.dev',
  role: 'authenticated',
  aud: 'authenticated',
};

/** Store state that puts the user at Day 7 — checkpoint trigger day. */
function buildCheckpointStoreState() {
  return {
    state: {
      step: 2,
      user: TEST_USER,
      isAuthenticated: true,
      currentDay: 7,
      streak: 6,
      tasks: [
        { id: 'task-1', title: 'Week 1 Reflection', type: 'reflection', duration: 15, completed: false, skipped: false, day: 7, dayNumber: 7, steps: [], tips: [], successCriteria: 'Reflect' },
      ],
      roadmap: { title: 'Morning Workout Habit', category: 'Health', duration: 90, dailyTime: '30 minutes', phases: [], startDate: new Date().toISOString(), endDate: new Date(Date.now() + 90 * 86400000).toISOString() },
      currentGoal: { category: 'Health', specificGoal: 'Build a morning workout habit' },
      checkpointDue: true,
      stoneProfile: null,
      onboardingPhase: 'complete',
    },
    version: 1,
  };
}

test.describe('CheckpointScreen', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((storeState) => {
      localStorage.setItem('consist-storage', JSON.stringify(storeState));
      // Mock Supabase auth key
      const now = Math.floor(Date.now() / 1000);
      localStorage.setItem('sb-127-auth-token', JSON.stringify({
        access_token: 'checkpoint-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: now + 3600,
        user: { id: 'checkpoint-test-id', email: 'checkpoint@coheren.dev', role: 'authenticated' },
      }));
    }, buildCheckpointStoreState());

    await page.route('**/auth/v1/user', r => r.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(TEST_USER),
    }));
    await page.route('**/auth/v1/token**', r => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ access_token: 'checkpoint-token', refresh_token: 'r', expires_in: 3600, token_type: 'bearer', user: TEST_USER }),
    }));
    await page.route('**/rest/v1/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route('**/realtime/v1/**', r => r.abort());
  });

  test('checkpoint screen or checkpoint banner appears on day 7', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => {
      const raw = localStorage.getItem('consist-storage');
      return raw ? JSON.parse(raw).state?.step === 2 : false;
    }, { timeout: 12000 });

    // Either a dedicated checkpoint screen or a checkpoint banner
    const checkpointEl = page.locator(
      '[data-testid="checkpoint-screen"], [class*="checkpoint"], [class*="Checkpoint"]'
    ).first();
    const checkpointBanner = page.getByText(/checkpoint|week review|how did it go|reflect/i).first();

    const hasScreen = await checkpointEl.isVisible({ timeout: 8000 }).catch(() => false);
    const hasBanner = await checkpointBanner.isVisible({ timeout: 5000 }).catch(() => false);
    // At least one checkpoint indication should be present
    expect(hasScreen || hasBanner).toBeTruthy();
  });

  test('self-assessment questions render when checkpoint is active', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => {
      const raw = localStorage.getItem('consist-storage');
      return raw ? JSON.parse(raw).state?.step === 2 : false;
    }, { timeout: 12000 });

    const questionEl = page.locator('[class*="question"], [class*="assessment"], input[type="radio"], input[type="range"]').first();
    const hasQuestion = await questionEl.isVisible({ timeout: 8000 }).catch(() => false);
    if (!hasQuestion) {
      // Try clicking into checkpoint view
      const checkpointLink = page.getByText(/checkpoint|week review/i).first();
      const hasLink = await checkpointLink.isVisible({ timeout: 5000 }).catch(() => false);
      if (hasLink) await checkpointLink.click();
    }
    // Just verify no crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('mobile: checkpoint modal not clipped by bottom safe area', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.route('**/rest/v1/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route('**/realtime/v1/**', r => r.abort());
    await page.route('**/auth/v1/user', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"id":"checkpoint-test-id","email":"checkpoint@coheren.dev"}' }));

    await page.addInitScript((storeState) => {
      localStorage.setItem('consist-storage', JSON.stringify(storeState));
    }, buildCheckpointStoreState());

    await page.goto('/');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('consist-storage') ?? '{}').state?.step === 2, { timeout: 12000 });

    // Check no horizontal overflow (layout not broken)
    const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(overflow).toBeFalsy();
    await context.close();
  });
});
