import { test, expect } from '@playwright/test';

/**
 * Smoke tests — verify the app loads and the landing page is reachable.
 * No auth or DB required.
 */

test.beforeEach(async ({ page }) => {
  // Clear any leftover store state so we always start at the landing page
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('landing page renders the hero headline', async ({ page }) => {
  await expect(page.locator('h1, [data-testid="hero-headline"]').first()).toBeVisible();
});

test('landing page has a "Get started" call-to-action', async ({ page }) => {
  // The CTA could be a button or a form input — look for common text
  const cta = page.getByRole('button', { name: /get started|start|begin/i })
    .or(page.getByPlaceholder(/goal|start/i).first());
  await expect(cta.first()).toBeVisible();
});

test('app title is set correctly', async ({ page }) => {
  await expect(page).toHaveTitle(/coheren/i);
});

test('page has no JS errors on load', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.waitForLoadState('networkidle');
  // Filter out known non-fatal warnings (framer-motion position warning, supabase offline)
  const fatalErrors = errors.filter(
    (e) =>
      !e.includes('non-static position') &&
      !e.includes('Failed to fetch') &&
      !e.includes('ERR_CONNECTION_REFUSED')
  );
  expect(fatalErrors).toHaveLength(0);
});
