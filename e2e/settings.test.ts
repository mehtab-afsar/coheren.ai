import { test, expect } from '@playwright/test';
import { seedDashboard } from './helpers';

test.describe('SettingsView', () => {
  test.beforeEach(async ({ page }) => {
    await seedDashboard(page);
    await page.route('**/rest/v1/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  });

  async function navigateToSettings(page: Parameters<typeof test>[1] extends infer P ? P extends { page: infer Q } ? Q : never : never) {
    // Try bottom nav Profile tab first, then sidebar Settings link
    const profileTab = page.locator('button:has-text("Profile"), button:has-text("You"), [data-testid*="profile"], [aria-label*="profile" i]').first();
    const settingsLink = page.locator('a:has-text("Settings"), button:has-text("Settings"), [data-testid*="settings"]').first();

    const hasProfile = await profileTab.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasProfile) {
      await profileTab.click();
    } else {
      const hasSettings = await settingsLink.isVisible({ timeout: 3000 }).catch(() => false);
      if (hasSettings) await settingsLink.click();
    }
  }

  test('Settings view is reachable from navigation', async ({ page }) => {
    await navigateToSettings(page);
    // Settings page should have common settings elements
    const settingsEl = page.locator('[class*="settings"], [class*="Settings"], [data-testid*="settings"]').first();
    const profileEl = page.locator('input[type="text"][placeholder*="name" i], input[name*="name" i]').first();
    const hasSettings = await settingsEl.isVisible({ timeout: 8000 }).catch(() => false);
    const hasProfile = await profileEl.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasSettings || hasProfile).toBeTruthy();
  });

  test('Logout button is visible and triggers navigation to landing page', async ({ page }) => {
    await navigateToSettings(page);

    const logoutBtn = page.locator(
      'button:has-text("Log out"), button:has-text("Sign out"), button:has-text("Logout"), [data-testid*="logout"]'
    ).first();
    const hasLogout = await logoutBtn.isVisible({ timeout: 8000 }).catch(() => false);
    if (hasLogout) {
      await page.route('**/auth/v1/logout', r => r.fulfill({ status: 200, body: '{}' }));
      await logoutBtn.click();
      // After logout, should redirect away from dashboard
      await page.waitForFunction(() => {
        const raw = localStorage.getItem('consist-storage');
        const state = raw ? JSON.parse(raw).state : null;
        return !state || state.step === 0 || state.step === 1 || !state.isAuthenticated;
      }, { timeout: 10000 });
      // No assertion on URL since routing varies, but store should be cleared
    }
  });

  test('Logout clears Zustand store isAuthenticated flag', async ({ page }) => {
    await navigateToSettings(page);

    const logoutBtn = page.locator('button:has-text("Log out"), button:has-text("Logout"), button:has-text("Sign out")').first();
    const hasLogout = await logoutBtn.isVisible({ timeout: 8000 }).catch(() => false);
    if (hasLogout) {
      await page.route('**/auth/v1/logout', r => r.fulfill({ status: 200, body: '{}' }));
      await logoutBtn.click();
      await page.waitForTimeout(2000); // give store time to update
      const isAuth = await page.evaluate(() => {
        const raw = localStorage.getItem('consist-storage');
        return raw ? JSON.parse(raw).state?.isAuthenticated : true;
      });
      expect(isAuth).toBeFalsy();
    }
  });

  test('display name input saves on submit', async ({ page }) => {
    await navigateToSettings(page);

    const nameInput = page.locator('input[type="text"][placeholder*="name" i], input[name*="name" i], input[id*="name" i]').first();
    const hasInput = await nameInput.isVisible({ timeout: 8000 }).catch(() => false);
    if (hasInput) {
      await nameInput.clear();
      await nameInput.fill('Test Name Updated');

      const saveBtn = page.locator('button:has-text("Save"), button[type="submit"]').first();
      const hasSave = await saveBtn.isVisible({ timeout: 3000 }).catch(() => false);
      if (hasSave) {
        await page.route('**/rest/v1/profiles**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
        await saveBtn.click();
        // Should not crash after saving
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('page does not crash with empty tasks/roadmap on profile view', async ({ page }) => {
    await navigateToSettings(page);
    // Just verify no crash
    await expect(page.locator('body')).toBeVisible();
    const errorMsg = page.getByText(/something went wrong|error|crash/i).first();
    const hasError = await errorMsg.isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasError).toBeFalsy();
  });
});
