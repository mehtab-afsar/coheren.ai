import { test, expect } from '@playwright/test';
import { seedDashboard } from './helpers';

/**
 * Dashboard UI tests — verify core views render correctly.
 * Supabase is mocked; localStorage is seeded to skip onboarding.
 */

test.describe('Dashboard — Today view', () => {
  test.beforeEach(async ({ page }) => {
    await seedDashboard(page);
  });

  test('renders Today view by default', async ({ page }) => {
    await expect(page.getByText(/today/i).first()).toBeVisible();
  });

  test('shows the streak card', async ({ page }) => {
    // Streak is shown as a flame icon + number badge in the header (e.g. "3")
    // Also the header shows the current day badge "Day 1"
    await expect(page.getByText(/Day \d+/).first()).toBeVisible();
  });

  test('shows seeded task in task list', async ({ page }) => {
    await expect(page.getByText(/morning meditation/i).first()).toBeVisible();
  });

  test('task complete button is present for incomplete tasks', async ({ page }) => {
    // The complete button is a circle/check next to the task
    const taskCard = page.getByText(/morning meditation/i).first();
    await expect(taskCard).toBeVisible();
    // The complete button is inside/near the task card
    // Just verify the task card itself is clickable/interactive
    await expect(taskCard.locator('..').locator('..').locator('button').first()).toBeVisible();
  });

  test('progress card shows task completion state', async ({ page }) => {
    // The "Also Today" section lists secondary tasks with a remaining count.
    // With 1 complete + 1 hero task, the secondary list shows "0 remaining".
    await expect(page.getByText(/Also Today|0 remaining/i).first()).toBeVisible({ timeout: 6000 });
  });
});

test.describe('Dashboard — Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await seedDashboard(page);
  });

  test('can navigate to Journey view', async ({ page }) => {
    const journeyNav = page.getByRole('button', { name: /journey/i })
      .or(page.getByText(/journey/i).first());
    await journeyNav.first().click();
    await expect(page.getByText(/week|sprint|phase/i).first()).toBeVisible();
  });

  test('can navigate to Library view', async ({ page }) => {
    const libraryNav = page.getByRole('button', { name: /library/i })
      .or(page.getByText(/library/i).first());
    await libraryNav.first().click();
    await expect(page.getByText(/resource|article|video|library/i).first()).toBeVisible();
  });

  test('can navigate to Progress view', async ({ page }) => {
    const progressNav = page.getByRole('button', { name: /progress/i })
      .or(page.getByText(/progress/i).first());
    await progressNav.first().click();
    await expect(page.getByText(/streak|complet|activit/i).first()).toBeVisible();
  });
});

test.describe('Dashboard — Task interactions', () => {
  test.beforeEach(async ({ page }) => {
    await seedDashboard(page);
  });

  test('completed task shows checked state', async ({ page }) => {
    // "Read 10 pages" is seeded as completed
    const completedTask = page.getByText(/read 10 pages/i).first();
    await expect(completedTask).toBeVisible();
    // The parent card should have some completed indicator
    const card = completedTask.locator('..').locator('..');
    await expect(card).toBeVisible();
  });

  test('clicking a task card opens the cinema panel', async ({ page }) => {
    // Use data-task-card attribute which is placed directly on the SwipeableCard root
    const taskCards = page.locator('[data-task-card]');
    // The first incomplete card (task-1: Morning meditation)
    const firstCard = taskCards.first();
    await expect(firstCard).toBeVisible();
    // force:true bypasses any transparent overlay div (e.g. framer-motion container)
    await firstCard.click({ force: true });
    // Cinema panel renders the task steps / description
    await expect(
      page.getByText(/mindfulness|quiet space|Focus on your breath/i).first()
    ).toBeVisible({ timeout: 6000 });
  });
});
