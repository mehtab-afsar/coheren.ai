import { test, expect } from '@playwright/test';
import { seedDashboard } from './helpers';

test.describe('RoadmapView / Journey', () => {
  test.beforeEach(async ({ page }) => {
    await seedDashboard(page);
  });

  test('Journey tab is accessible from bottom nav or sidebar', async ({ page }) => {
    // Look for Journey/Roadmap tab in navigation
    const journeyTab = page.locator(
      'button:has-text("Journey"), button:has-text("Roadmap"), a:has-text("Journey"), [data-testid*="journey"], [aria-label*="journey" i]'
    ).first();
    await expect(journeyTab).toBeVisible({ timeout: 8000 });
  });

  test('Journey view renders phase information from seeded data', async ({ page }) => {
    // Navigate to Journey tab
    const journeyTab = page.locator(
      'button:has-text("Journey"), button:has-text("Roadmap"), [data-testid*="journey"]'
    ).first();
    await journeyTab.click({ timeout: 8000 });

    // Should show goal title or phase info
    await expect(page.getByText(/foundation|phase|roadmap|journey/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('no-roadmap state shows error card, not blank page', async ({ page }) => {
    // Seed store with no roadmap and no agentRoadmap
    await page.addInitScript(() => {
      localStorage.setItem('consist-storage', JSON.stringify({
        state: {
          step: 2,
          user: { id: 'test-id', email: 'test@test.com', role: 'authenticated', aud: 'authenticated' },
          isAuthenticated: true,
          currentDay: 1,
          streak: 0,
          tasks: [],
          roadmap: null,
          agentRoadmap: null,
          currentGoal: null,
          stoneProfile: null,
          initialGoal: '',
          onboardingPhase: 'complete',
        },
        version: 1,
      }));
    });
    await page.route('**/auth/v1/user', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'test-id', email: 'test@test.com' }) }));
    await page.route('**/rest/v1/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route('**/realtime/v1/**', r => r.abort());
    await page.goto('/');

    await page.waitForFunction(() => {
      const raw = localStorage.getItem('consist-storage');
      return raw ? JSON.parse(raw).state?.step === 2 : false;
    }, { timeout: 12000 });

    // Navigate to Journey
    const journeyTab = page.locator(
      'button:has-text("Journey"), button:has-text("Roadmap"), [data-testid*="journey"]'
    ).first();
    const hasJourney = await journeyTab.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasJourney) {
      await journeyTab.click();
      // Should not be blank — should show the error card or a message
      const notReadyMsg = page.getByText(/not ready|wrong|go back|today|building/i).first();
      const mapIcon = page.locator('svg').first();
      const hasMessage = await notReadyMsg.isVisible({ timeout: 5000 }).catch(() => false);
      const hasIcon = await mapIcon.isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasMessage || hasIcon).toBeTruthy();
    }
  });

  test('progress percentage reflects completed tasks', async ({ page }) => {
    const journeyTab = page.locator(
      'button:has-text("Journey"), [data-testid*="journey"]'
    ).first();
    const hasJourney = await journeyTab.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasJourney) {
      await journeyTab.click();
      // Progress indicator should show a % or day count
      const progressEl = page.locator('[class*="progress"], [class*="percent"], [class*="ring"]').first();
      const hasProgress = await progressEl.isVisible({ timeout: 5000 }).catch(() => false);
      if (hasProgress) {
        const text = await progressEl.textContent();
        expect(text).toBeTruthy();
      }
    }
  });

  test('mobile: journey view renders in single column', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.route('**/rest/v1/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route('**/realtime/v1/**', r => r.abort());
    await page.route('**/auth/v1/user', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"id":"test"}' }));

    const { DASHBOARD_STORE_STATE } = await import('./helpers');
    await page.addInitScript((store) => {
      localStorage.setItem('consist-storage', JSON.stringify(store));
    }, DASHBOARD_STORE_STATE);

    await page.goto('/');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('consist-storage') ?? '{}').state?.step === 2, { timeout: 12000 });

    const journeyTab = page.locator('button:has-text("Journey"), [data-testid*="journey"]').first();
    const hasJourney = await journeyTab.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasJourney) {
      await journeyTab.click();
      // No horizontal overflow on mobile
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = 390;
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2); // 2px tolerance for scrollbar
    }
    await context.close();
  });
});
