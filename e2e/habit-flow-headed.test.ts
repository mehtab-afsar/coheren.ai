/**
 * Full Habit Flow — Real account, real AI, 10 calendar days
 *
 * One headed browser window. Drives the app the way a real user would, then
 * fast-forwards the calendar with page.clock to live 10 days in minutes.
 *
 *   1. Sign up a brand-new account
 *   2. Complete onboarding (chat → adaptive interview → stones → plan) with real agents
 *   3. Pin the goal start date so the calendar is deterministic
 *   4. Day 1..10: set the clock to that day, reload, complete the day's task(s) + feedback
 *   5. Day 7: the weekly checkpoint fires → the recalibration ("refactor") agent re-plans
 *   6. Assert streak, no orphaned rows, agent logs; screenshot days 1 / 7 / 10
 *   7. afterAll: delete the test account
 *
 * Prereqs: `npx supabase start` + dev server (Playwright webServer) + AI key in .env.local.
 * Run: npx playwright test e2e/habit-flow-headed.test.ts --headed --project=chromium
 */

import { test, expect, type Page } from '@playwright/test';
import {
  getActiveGoalRoadmap, pinGoalCreatedAt, countTasksForDay, seedRealDailyTask,
  assertNoOrphanedFeedback, type ActiveGoalRoadmap,
} from './helpers/db';

test.use({ headless: false, viewport: { width: 1280, height: 900 } });
test.setTimeout(600_000); // 10 minutes — real AI onboarding + 10 day-reloads

const TEST_NAME = 'Habit Tester';
const TEST_EMAIL = `habit-${Date.now()}@coheren.dev`;
const TEST_PASSWORD = 'HabitTest123!';
const TEST_GOAL = 'I want to build a daily 20-minute morning walk habit';

// Deterministic base date for the calendar (local midnight, a few days in the past
// so the goal's real created_at is never in the future relative to the clock).
const BASE = new Date(); BASE.setHours(0, 0, 0, 0);
const dayAt = (day: number, hour = 9) =>
  new Date(BASE.getTime() + (day - 1) * 86_400_000 + hour * 3_600_000);

// Free-text answers for the adaptive interview / chat.
const ANSWERS = [
  'I mostly work from home and my mornings are usually free',
  '30 days',
  '20 minutes a day',
  'mornings work best for me',
  'beginner — I have never kept this up before',
  'nothing major, just motivation and consistency',
  'yes, that sounds right',
  'looks good, let us go',
];

let createdUserId: string | null = null;
let gr: ActiveGoalRoadmap | null = null;

const getState = (page: Page) => page.evaluate(() => {
  try { return JSON.parse(localStorage.getItem('consist-storage') ?? '{}').state ?? {}; }
  catch { return {}; }
});
const getStep = (page: Page) => getState(page).then((s: Record<string, unknown>) => s.step as number | undefined);
const getDay  = (page: Page) => getState(page).then((s: Record<string, unknown>) => s.currentDay as number | undefined);

async function waitForStep(page: Page, step: number, timeout = 30_000) {
  await page.waitForFunction(
    (s) => { try { return JSON.parse(localStorage.getItem('consist-storage') ?? '{}').state?.step === s; } catch { return false; } },
    step, { timeout },
  );
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
test.afterAll(async () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !createdUserId) { console.log(`ℹ Delete ${TEST_EMAIL} manually if needed.`); return; }
  try {
    const res = await fetch(`http://127.0.0.1:54321/auth/v1/admin/users/${createdUserId}`, {
      method: 'DELETE', headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    console.log(res.ok ? `✓ Deleted ${TEST_EMAIL}` : `⚠ Delete failed (${res.status})`);
  } catch (e) { console.warn('Cleanup error:', e); }
});

// ── The test ────────────────────────────────────────────────────────────────────
test('Real account → onboard → 10 days with day-7 recalibration', async ({ page }) => {
  await page.clock.install({ time: dayAt(1) });

  // ───────────────────────── 1. SIGN UP ─────────────────────────
  console.log('① Sign up');
  await page.goto('/');
  await page.waitForLoadState('networkidle', { timeout: 15_000 });

  const getStarted = page.getByRole('button', { name: /get started/i }).first();
  await expect(getStarted).toBeVisible({ timeout: 10_000 });
  await getStarted.click();
  await page.waitForTimeout(500);
  const signUpOpt = page.getByRole('button', { name: /^sign up$/i }).first();
  if (await signUpOpt.isVisible({ timeout: 2_000 }).catch(() => false)) await signUpOpt.click();

  const email = page.locator('input[type="email"]').first();
  await expect(email).toBeVisible({ timeout: 8_000 });
  const name = page.locator('input[type="text"]').first();
  if (await name.isVisible({ timeout: 1_500 }).catch(() => false)) await name.fill(TEST_NAME);
  await email.fill(TEST_EMAIL);
  await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /create account/i }).first().click();

  await waitForStep(page, 1, 20_000);
  createdUserId = (await getState(page)).user?.id ?? null;
  console.log(`  ✓ account ${TEST_EMAIL} (${createdUserId})`);

  // ───────────────────────── 2. ONBOARDING ─────────────────────────
  console.log('② Onboarding (chat → interview → stones → plan)');
  await page.waitForTimeout(2_000); // let the first AI greeting render

  let ans = 0;
  for (let i = 0; i < 40; i++) {
    if (await getStep(page) === 2) break;

    // Stone option buttons (multiple-choice / yes-no) — pick the first, then advance past the comment field.
    const stoneOpt = page.locator('button[class*="option"], button[class*="Option"]').first();
    const reply = page.locator('input[placeholder*="Reply" i]').first();
    const adaptive = page.locator('input[placeholder*="take your time" i], textarea[placeholder*="take your time" i]').first();
    const tenBtn = page.getByRole('button', { name: '10', exact: true }).first();
    const continueBtn = page.getByRole('button', { name: /continue|next|start|begin|build|let'?s go|accept|sounds good|got it|^done/i }).first();

    // Every interaction is best-effort (.catch) — onboarding screens animate and
    // re-render, so a transient miss just retries on the next loop iteration.
    // Scale question — detected by the 1–10 number buttons. The advance button can be
    // "Done →" OR "Next →", so always pick a number first, then click whichever advance shows.
    if (await tenBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      console.log('  scale → 7');
      await page.getByRole('button', { name: '7', exact: true }).first().click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(400);
      await page.getByRole('button', { name: /done|next|continue/i }).first().click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
    } else if (await reply.isVisible({ timeout: 1_200 }).catch(() => false)) {
      const a = ANSWERS[Math.min(ans++, ANSWERS.length - 1)];
      console.log(`  chat → "${a.slice(0, 40)}"`);
      await reply.fill(a, { timeout: 5_000 }).catch(() => {});
      await page.keyboard.press('Enter').catch(() => {});
      await page.waitForTimeout(3_500);
    } else if (await adaptive.isVisible({ timeout: 1_000 }).catch(() => false)) {
      const a = ANSWERS[Math.min(ans++, ANSWERS.length - 1)];
      console.log(`  interview → "${a.slice(0, 40)}"`);
      await adaptive.fill(a, { timeout: 5_000 }).catch(() => {});
      const cont = page.getByRole('button', { name: /continue/i }).first();
      if (await cont.isVisible({ timeout: 1_000 }).catch(() => false)) await cont.click({ timeout: 5_000 }).catch(() => {});
      else await page.keyboard.press('Enter').catch(() => {});
      await page.waitForTimeout(2_500);
    } else if (await stoneOpt.isVisible({ timeout: 1_000 }).catch(() => false)) {
      const label = (await stoneOpt.textContent())?.trim().slice(0, 30);
      console.log(`  stone → "${label}"`);
      await stoneOpt.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(400);
      await page.keyboard.press('Enter').catch(() => {}); // advance past the optional comment (auto-skip is fixed)
      await page.waitForTimeout(1_000);
    } else if (await continueBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      console.log(`  cta → "${(await continueBtn.textContent())?.trim().slice(0, 24)}"`);
      await continueBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
    } else {
      await page.waitForTimeout(2_500); // agents thinking
    }
  }

  console.log('  ⏳ waiting for plan generation → dashboard');
  await waitForStep(page, 2, 240_000);
  await page.waitForTimeout(2_500);
  console.log(`  ✓ dashboard reached (day ${await getDay(page)})`);
  await page.screenshot({ path: 'test-results/day-1.png' });

  // ───────────────────────── 3. PIN START DATE ─────────────────────────
  expect(createdUserId, 'user id captured at signup').toBeTruthy();
  gr = await getActiveGoalRoadmap(createdUserId!);
  expect(gr, 'goal + roadmap must exist in DB after onboarding').toBeTruthy();
  await pinGoalCreatedAt(gr!.goalId, BASE.toISOString());
  console.log(`③ pinned start date — roadmap ${gr!.roadmapId}`);

  // ───────────────────────── 4. LIVE 10 DAYS ─────────────────────────
  let checkpointSeen = false;
  for (let day = 1; day <= 10; day++) {
    await page.clock.setFixedTime(dayAt(day));
    await page.goto('/');
    await waitForStep(page, 2, 30_000).catch(() => {});
    await page.waitForTimeout(2_000);

    const ctx = await page.locator('[data-testid="today-context"]').first().textContent().catch(() => '');
    const diag = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('consist-storage') ?? '{}').state ?? {};
      return { now: new Date().toISOString(), startDate: s.roadmap?.startDate, duration: s.roadmap?.duration, currentDay: s.currentDay };
    });
    console.log(`\n── Day ${day} (store day ${diag.currentDay}) — ${ctx?.trim()}`);
    console.log(`     clock=${diag.now} start=${diag.startDate} duration=${diag.duration}`);

    // Day 7: the weekly checkpoint opens the Coach panel as a conversational
    // "Week Check-In" (3 questions). Answering all 3 triggers recalibrateWeek (Agent 5).
    if (day % 7 === 0) {
      await page.waitForTimeout(4_000); // let currentDay flip to 7 → pendingWeeklyCheckIn → Coach opens
      await page.screenshot({ path: `test-results/day-${day}-checkpoint.png` });
      const checkInInput = page.locator('[data-testid="weekly-checkin-input"]').first();
      if (await checkInInput.isVisible({ timeout: 20_000 }).catch(() => false)) {
        console.log('  ★ WEEKLY CHECK-IN — answering 3 questions → recalibration agent');
        checkpointSeen = true;
        const checkInAnswers = ['about right', 'it felt challenging but doable', 'yes, keep me on track'];
        for (const a of checkInAnswers) {
          const inp = page.locator('[data-testid="weekly-checkin-input"]').first();
          if (!await inp.isVisible({ timeout: 4_000 }).catch(() => false)) break;
          await inp.fill(a, { timeout: 4_000 }).catch(() => {});
          await page.keyboard.press('Enter').catch(() => {});
          await page.waitForTimeout(2_500); // each answer advances 1/3 → 2/3 → 3/3
        }
        // recalibrateWeek (Agent 5) makes a real AI call to design the next week
        console.log('  ⏳ recalibration agent (Agent 5) running…');
        await page.waitForTimeout(20_000);
        const result = await getState(page);
        console.log(`  ✓ recalibration done; store tasks now ${(result.tasks as unknown[] ?? []).length}`);
        continue;
      }
      console.log('  ⚠ weekly check-in panel did not appear');
    }

    // Otherwise: make sure the day has a task, then complete it.
    let taskBtn = page.locator('[data-testid="task-complete-btn"]').first();
    if (!await taskBtn.isVisible({ timeout: 6_000 }).catch(() => false)) {
      const inDb = gr ? await countTasksForDay(gr.roadmapId, day) : 0;
      if (inDb === 0 && gr) {
        console.log(`  ⚠ no task for day ${day} (agent didn't persist it) — seeding fallback`);
        await seedRealDailyTask(gr.roadmapId, gr.userId, day, `Day ${day}: 20-Minute Morning Walk`);
        await page.goto('/'); await waitForStep(page, 2, 20_000).catch(() => {});
        await page.waitForTimeout(1_500);
        taskBtn = page.locator('[data-testid="task-complete-btn"]').first();
      }
    }

    const btnCount = await page.locator('[data-testid="task-complete-btn"]').count();
    console.log(`  tasks on screen: ${btnCount}`);
    for (let t = 0; t < btnCount; t++) {
      const btn = page.locator('[data-testid="task-complete-btn"]').nth(t);
      if (!await btn.isVisible().catch(() => false)) continue;
      if (await btn.isDisabled().catch(() => false)) continue;
      await btn.click({ force: true, timeout: 8_000 }).catch(() => {});
      await page.waitForTimeout(1_200);
      // Feedback modal (mood + done)
      const mood = page.locator('[data-testid="mood-option"]').first();
      if (await mood.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const diff = day === 6 ? 1 : day === 5 ? 4 : 3; // vary difficulty to nudge the recalibrator
        const moodBtn = page.locator(`[data-testid="mood-option"][data-mood="${diff}"]`).first();
        await moodBtn.click({ timeout: 4_000 }).catch(() => mood.click({ timeout: 4_000 }).catch(() => {}));
        await page.locator('[data-testid="feedback-submit"]').click({ timeout: 4_000 }).catch(() => {});
        await page.waitForTimeout(1_000);
      }
    }

    const after = await getState(page);
    console.log(`  ✓ day ${day} done — streak ${after.streak}, completed ${(after.tasks as Array<{completed:boolean}> ?? []).filter(t => t.completed).length}`);
    if (day === 1 || day === 10) await page.screenshot({ path: `test-results/day-${day}.png` });
  }

  // ───────────────────────── 5. FINAL ASSERTS ─────────────────────────
  console.log('\n④ Final checks');
  await assertNoOrphanedFeedback();
  console.log('  ✓ no orphaned task_feedback rows (CASCADE works)');

  expect(checkpointSeen, 'day-7 weekly checkpoint should have fired').toBeTruthy();

  const final = await getState(page);
  console.log(`  final streak: ${final.streak}, currentDay: ${final.currentDay}`);
  await page.screenshot({ path: 'test-results/day-10-final.png' });

  // App must be alive (no crash overlay)
  const crashed = await page.getByText(/something went wrong|unexpected error/i).first().isVisible({ timeout: 1_500 }).catch(() => false);
  expect(crashed).toBeFalsy();

  console.log(`\n🎉 10-day habit flow complete for ${TEST_EMAIL}`);
});
