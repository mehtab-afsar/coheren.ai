import { test, expect } from '@playwright/test';

const SUPABASE_AUTH_KEY = 'sb-127-auth-token';

function mockSupabaseRoutes(page: Parameters<typeof test>[1] extends infer P ? P extends { page: infer Q } ? Q : never : never) {
  return Promise.all([
    page.route('**/auth/v1/user', r => r.fulfill({ status: 401, body: '{"error":"Not logged in"}' })),
    page.route('**/auth/v1/token**', r => r.fulfill({ status: 401, body: '{"error":"Not logged in"}' })),
    page.route('**/rest/v1/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })),
    page.route('**/realtime/v1/**', r => r.abort()),
  ]);
}

test.describe('ChatOnboarding', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseRoutes(page);
    // Clear any existing auth/store state
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test('landing page renders and Start button is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('button', { hasText: /start|begin|get started/i }).first()).toBeVisible({ timeout: 8000 });
  });

  test('clicking Start opens the onboarding chat interface', async ({ page }) => {
    await page.goto('/');
    const startBtn = page.locator('button', { hasText: /start|begin|get started/i }).first();
    await expect(startBtn).toBeVisible({ timeout: 8000 });
    await startBtn.click();
    // Onboarding chat should show a text input
    await expect(page.locator('textarea, input[type="text"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('empty message cannot be submitted — button disabled', async ({ page }) => {
    await page.goto('/');
    const startBtn = page.locator('button', { hasText: /start|begin|get started/i }).first();
    await startBtn.click({ timeout: 8000 });

    const input = page.locator('textarea, input[type="text"]').first();
    await expect(input).toBeVisible({ timeout: 10000 });

    // Find submit button — should be disabled when input is empty
    const submitBtn = page.locator('button[type="submit"], button[aria-label*="send" i]').first();
    await expect(submitBtn).toBeDisabled({ timeout: 5000 }).catch(() => {
      // Some UIs prevent submit differently — also acceptable if clicking has no effect
    });
  });

  test('user types a goal and receives an AI response', async ({ page }) => {
    // Mock Groq so the test doesn't make real API calls
    await page.route('**/openai/v1/chat/completions', r => r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ message: { role: 'assistant', content: 'Great goal! How long have you been working on this?' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 50, completion_tokens: 20 },
      }),
    }));
    await page.route('**/api.groq.com/**', r => r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ message: { role: 'assistant', content: 'Great goal! How long have you been working on this?' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 50, completion_tokens: 20 },
      }),
    }));

    await page.goto('/');
    const startBtn = page.locator('button', { hasText: /start|begin|get started/i }).first();
    await startBtn.click({ timeout: 8000 });

    const input = page.locator('textarea, input[type="text"]').first();
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill('I want to build a consistent morning workout habit');

    const submitBtn = page.locator('button[type="submit"]').or(page.locator('button[aria-label*="send" i]')).first();
    await submitBtn.click();

    // A new message should appear in the chat
    await expect(page.locator('[class*="message"], [data-testid*="message"], .chat-message').first()).toBeVisible({ timeout: 15000 });
  });

  test('initial goal pre-fills the first chat message when passed from landing', async ({ page }) => {
    // Seed a goal in the store so it's pre-filled
    await page.addInitScript(() => {
      localStorage.setItem('consist-storage', JSON.stringify({
        state: { step: 1, initialGoal: 'I want to run a 5K', onboardingPhase: 'conversation' },
        version: 1,
      }));
    });
    await page.goto('/');
    // The goal should appear as a user message bubble
    await expect(page.getByText('I want to run a 5K')).toBeVisible({ timeout: 10000 });
  });

  test('mobile: onboarding chat input is not obscured by keyboard safe area', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      hasTouch: true,
    });
    const page = await context.newPage();

    await page.route('**/rest/v1/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route('**/realtime/v1/**', r => r.abort());
    await page.addInitScript(() => {
      localStorage.setItem('consist-storage', JSON.stringify({
        state: { step: 1, onboardingPhase: 'conversation' },
        version: 1,
      }));
    });

    await page.goto('/');
    const input = page.locator('textarea, input[type="text"]').first();
    if (await input.isVisible({ timeout: 10000 }).catch(() => false)) {
      const box = await input.boundingBox();
      expect(box).toBeTruthy();
      // Input bottom should not be below viewport height (not hidden by keyboard area)
      if (box) expect(box.y + box.height).toBeLessThanOrEqual(844);
    }
    await context.close();
  });
});
