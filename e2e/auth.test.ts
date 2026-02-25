import { test, expect } from '@playwright/test';

/**
 * Auth flow tests — sign-in and sign-up forms via the floating nav CTA dropdown.
 * Supabase network calls are intercepted; no running DB needed.
 */

test.beforeEach(async ({ page }) => {
  // Return empty session so the app stays at step 0 (landing page)
  await page.route('**/auth/v1/user', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'not authenticated' }) })
  );
  await page.route('**/auth/v1/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: null, session: null }) })
  );
  await page.route('**/rest/v1/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
  await page.route('**/realtime/v1/**', (route) => route.abort());

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  // Wait for auth timeout (5s) + landing page to render
  await page.waitForSelector('button', { timeout: 10000 });
});

/** Opens the "Get Started" CTA dropdown and clicks an item by label */
async function openCtaDropdown(page: import('@playwright/test').Page, label: 'Sign In' | 'Sign Up') {
  // The "Get Started" button is desktop-only (hidden sm:block)
  const ctaBtn = page.getByRole('button', { name: /get started/i });
  await ctaBtn.waitFor({ timeout: 8000 });
  await ctaBtn.click();
  // Dropdown item appears
  await page.getByRole('button', { name: new RegExp(label, 'i') }).click();
}

test('clicking "Get Started" reveals Sign In and Sign Up options', async ({ page }) => {
  const ctaBtn = page.getByRole('button', { name: /get started/i });
  await expect(ctaBtn).toBeVisible({ timeout: 8000 });
  await ctaBtn.click();
  await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});

test('Sign In dropdown item shows email + password form', async ({ page }) => {
  await openCtaDropdown(page, 'Sign In');
  await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator('input[type="password"]').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in|log in|continue/i }).first()).toBeVisible();
});

test('Sign Up dropdown item shows registration form', async ({ page }) => {
  await openCtaDropdown(page, 'Sign Up');
  await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator('input[type="password"]').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /sign up|create|continue/i }).first()).toBeVisible();
});

test('sign-in form shows error on invalid credentials', async ({ page }) => {
  // Return an auth error for login attempt
  await page.route('**/auth/v1/token**', (route) =>
    route.fulfill({
      status: 400, contentType: 'application/json',
      body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }),
    })
  );

  await openCtaDropdown(page, 'Sign In');
  await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 5000 });

  await page.locator('input[type="email"]').first().fill('bad@example.com');
  await page.locator('input[type="password"]').first().fill('wrongpassword');
  await page.getByRole('button', { name: /sign in|log in|continue/i }).first().click();

  await expect(page.getByText(/invalid|incorrect|error|credentials/i).first()).toBeVisible({ timeout: 8000 });
});
