/**
 * Date/time helpers for E2E simulation tests.
 * Uses Playwright's page.clock API to fake the system date.
 */

import type { Page } from '@playwright/test';

/** Base date for the 10-day simulation: 2026-06-01 */
export const SIMULATION_BASE_DATE = new Date('2026-06-01T09:00:00');

/**
 * Set the page clock to a specific simulation day (1-indexed).
 * Reloads the page so the app re-reads Date.now().
 */
export async function setSimDay(page: Page, day: number, baseDate = SIMULATION_BASE_DATE): Promise<void> {
  const target = new Date(baseDate);
  target.setDate(target.getDate() + (day - 1));
  await page.clock.setFixedTime(target);
}

/**
 * Install the fake clock before navigation (call before page.goto).
 */
export async function installClock(page: Page, startDate = SIMULATION_BASE_DATE): Promise<void> {
  await page.clock.install({ time: startDate });
}
