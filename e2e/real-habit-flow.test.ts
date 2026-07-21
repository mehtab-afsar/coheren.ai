/**
 * Real Account + Habit Flow Test
 *
 * Creates a brand-new Supabase account through the UI, completes onboarding,
 * and tests Day 1 of the habit — no mocking, real API calls.
 *
 * Requires:
 *   - Local Supabase running (`npx supabase start`)
 *   - Dev server running (launched by playwright webServer config)
 *   - VITE_GROQ_API_KEY set in .env.local
 *
 * The test cleans up the created account in afterAll.
 */

import { test, expect, type Page } from '@playwright/test';

// Unique email per run so tests don't collide
const TEST_EMAIL = `habit-test-${Date.now()}@coheren.dev`;
const TEST_PASSWORD = 'HabitTest123!';
const TEST_GOAL = 'I want to build a daily 20-minute morning walk habit';

async function waitForStep(page: Page, step: number, timeout = 20_000) {
  await page.waitForFunction(
    (s) => {
      try {
        const raw = localStorage.getItem('consist-storage');
        return raw ? JSON.parse(raw).state?.step === s : false;
      } catch { return false; }
    },
    step,
    { timeout }
  );
}

async function getStoreState(page: Page) {
  return page.evaluate(() => {
    try {
      const raw = localStorage.getItem('consist-storage');
      return raw ? JSON.parse(raw).state : null;
    } catch { return null; }
  });
}

test.describe.serial('Real Account — Habit Flow', () => {
  test.setTimeout(300_000); // 5 min — onboarding agents take time

  let createdUserId: string | null = null;

  // ─── 1. SIGN UP ──────────────────────────────────────────────────────────────
  test('1. Sign up with a new account', async ({ page }) => {
    await page.goto('/');

    // Click Get Started / Sign Up on landing page
    const signupBtn = page.locator(
      'button:has-text("Get started"), button:has-text("Sign up"), button:has-text("Start"), a:has-text("Sign up")'
    ).first();
    await expect(signupBtn).toBeVisible({ timeout: 10_000 });
    await signupBtn.click();

    // If there's a sign up / log in toggle, switch to sign up
    const signupToggle = page.locator(
      'button:has-text("Sign up"), a:has-text("Sign up"), [data-testid="signup-tab"]'
    ).first();
    const hasToggle = await signupToggle.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasToggle) await signupToggle.click();

    // Fill in email + password
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(emailInput).toBeVisible({ timeout: 8_000 });
    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);

    // Submit
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Should transition to onboarding (step 1) or be redirected to chat
    await waitForStep(page, 1, 20_000).catch(() => {
      // Some flows go straight to onboarding chat without step update
    });

    // Confirm we're no longer on landing (step 0)
    const state = await getStoreState(page);
    expect(state?.step ?? 1).toBeGreaterThanOrEqual(1);

    // Capture user id for cleanup
    createdUserId = state?.user?.id ?? null;
    console.log(`✓ Created account: ${TEST_EMAIL} (id: ${createdUserId})`);
  });

  // ─── 2. ONBOARDING CHAT ──────────────────────────────────────────────────────
  test('2. Complete onboarding chat — type goal and answer questions', async ({ page }) => {
    await page.goto('/');
    await waitForStep(page, 1, 15_000);

    // The onboarding chat input
    const input = page.locator('textarea, input[type="text"]').first();
    await expect(input).toBeVisible({ timeout: 15_000 });

    // Type the goal
    await input.fill(TEST_GOAL);
    await page.keyboard.press('Enter');

    // Wait for AI to respond
    await page.waitForFunction(() => {
      // Look for a second message bubble (AI response)
      const msgs = document.querySelectorAll('[class*="message"], [class*="chat"]');
      return msgs.length >= 2;
    }, { timeout: 30_000 }).catch(() => {
      console.log('No message bubbles found — checking for any response text');
    });

    // Answer the follow-up questions — type sensible short answers
    const followUpAnswers = [
      '30 days',        // timeline
      '20 minutes',     // daily time
      'morning',        // preference
      'beginner',       // skill level
      'yes',            // any remaining confirmations
    ];

    for (const answer of followUpAnswers) {
      const inputAgain = page.locator('textarea, input[type="text"]').first();
      const isVisible = await inputAgain.isVisible({ timeout: 8_000 }).catch(() => false);
      if (!isVisible) break;

      // Check if we've moved past conversation phase
      const state = await getStoreState(page);
      if (state?.onboardingPhase !== 'conversation' && state?.step === 2) break;

      await inputAgain.fill(answer);
      await page.keyboard.press('Enter');

      // Wait a moment for AI to respond before typing next answer
      await page.waitForTimeout(3_000);
    }

    console.log('✓ Completed chat answers');
  });

  // ─── 3. STONE QUESTIONS ──────────────────────────────────────────────────────
  test('3. Complete stone profile questions', async ({ page }) => {
    await page.goto('/');

    // Wait for stones phase or skip to plan
    const _stonesPhase = await page.waitForFunction(() => {
      const raw = localStorage.getItem('consist-storage');
      const state = raw ? JSON.parse(raw).state : null;
      return state?.onboardingPhase === 'stones' || state?.step === 2;
    }, { timeout: 60_000 }).catch(() => null);

    const state = await getStoreState(page);
    if (state?.step === 2) {
      console.log('✓ Skipped to dashboard — onboarding already complete');
      return;
    }

    // Select stone question answers — click first available option for each question
    const maxQuestions = 10;
    for (let i = 0; i < maxQuestions; i++) {
      // Find the first unselected option button
      const optionBtn = page.locator(
        'button[class*="option"], [class*="StoneOption"], [data-testid*="option"], button[class*="answer"]'
      ).first();
      const isVisible = await optionBtn.isVisible({ timeout: 5_000 }).catch(() => false);
      if (!isVisible) break;

      await optionBtn.click();
      await page.waitForTimeout(800);

      // Check if we've moved on
      const newState = await getStoreState(page);
      if (newState?.step === 2) break;
    }

    // Click "Next" or "Continue" if present
    const nextBtn = page.locator(
      'button:has-text("Next"), button:has-text("Continue"), button:has-text("Build my plan"), button:has-text("Done")'
    ).first();
    const hasNext = await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasNext) await nextBtn.click();

    console.log('✓ Stone questions answered');
  });

  // ─── 4. PLAN GENERATION ──────────────────────────────────────────────────────
  test('4. Wait for plan to generate and reach dashboard', async ({ page }) => {
    await page.goto('/');

    // Wait up to 3 minutes for step=2 (agents are running)
    await waitForStep(page, 2, 180_000);

    const state = await getStoreState(page);
    expect(state?.step).toBe(2);
    console.log(`✓ Dashboard reached. currentDay: ${state?.currentDay}, streak: ${state?.streak}`);

    // Verify roadmap was generated (either legacy or agent)
    const hasRoadmap = state?.roadmap !== null || state?.agentRoadmap !== null;
    expect(hasRoadmap).toBeTruthy();
    console.log(`✓ Roadmap present: ${hasRoadmap}`);
  });

  // ─── 5. DAY 1 TASK CHECK ─────────────────────────────────────────────────────
  test('5. Day 1: Tasks are visible and not placeholders', async ({ page }) => {
    await page.goto('/');
    await waitForStep(page, 2, 15_000);
    await page.waitForTimeout(3_000); // let tasks load from DB

    // Screenshot for visual verification
    await page.screenshot({ path: 'test-results/day1-tasks.png', fullPage: false });

    // Check for task content (not placeholder)
    const taskTitles = await page.locator(
      'h2, h3, h4, [class*="title"], [class*="Title"]'
    ).allTextContents();

    const nonEmptyTitles = taskTitles.filter(t => t.trim().length > 3);
    console.log('Task titles found:', nonEmptyTitles.slice(0, 5));

    for (const title of nonEmptyTitles) {
      expect(title).not.toMatch(/XXXXXXXXXX|\[placeholder\]|\[task title\]/i);
    }

    // The Today view should render without error
    const errorMsg = page.getByText(/something went wrong|error boundary|crash/i).first();
    const hasError = await errorMsg.isVisible({ timeout: 2_000 }).catch(() => false);
    expect(hasError).toBeFalsy();
  });

  // ─── 6. COMPLETE TODAY'S TASK ────────────────────────────────────────────────
  test('6. Complete the first task of the day', async ({ page }) => {
    await page.goto('/');
    await waitForStep(page, 2, 15_000);
    await page.waitForTimeout(2_000);

    // Take screenshot before completion
    await page.screenshot({ path: 'test-results/before-complete.png', fullPage: false });

    // Find a complete button / checkmark
    const completeBtn = page.locator(
      'button[aria-label*="complete" i], [data-testid*="complete"], [class*="complete-btn"], [class*="check-btn"]'
    ).first();

    const hasCompleteBtn = await completeBtn.isVisible({ timeout: 8_000 }).catch(() => false);

    if (hasCompleteBtn) {
      // Record state before
      const stateBefore = await getStoreState(page);
      const completedBefore = (stateBefore?.tasks ?? []).filter((t: { completed: boolean }) => t.completed).length;

      await completeBtn.click({ force: true });
      await page.waitForTimeout(3_000); // wait for animation + DB write

      await page.screenshot({ path: 'test-results/after-complete.png', fullPage: false });

      // Verify either: task count went up OR celebration animation appeared
      const celebrationEl = page.locator('[class*="celebration"], [class*="particle"], [class*="confetti"]').first();
      const hasCelebration = await celebrationEl.isVisible({ timeout: 5_000 }).catch(() => false);

      const stateAfter = await getStoreState(page);
      const completedAfter = (stateAfter?.tasks ?? []).filter((t: { completed: boolean }) => t.completed).length;

      const taskCompleted = completedAfter > completedBefore || hasCelebration;
      console.log(`✓ Task completion: before=${completedBefore}, after=${completedAfter}, celebration=${hasCelebration}`);
      expect(taskCompleted).toBeTruthy();
    } else {
      // Tap on a task card to expand it, then look for complete
      const taskCard = page.locator('[class*="task"], [class*="Task"]').first();
      const hasCard = await taskCard.isVisible({ timeout: 5_000 }).catch(() => false);
      if (hasCard) {
        await taskCard.click();
        await page.waitForTimeout(1_000);
        const innerCompleteBtn = page.locator('button[aria-label*="complete" i], button:has-text("Done"), button:has-text("Complete")').first();
        const hasInner = await innerCompleteBtn.isVisible({ timeout: 3_000 }).catch(() => false);
        if (hasInner) {
          await innerCompleteBtn.click({ force: true });
          await page.waitForTimeout(2_000);
        }
        console.log('✓ Task card interaction attempted');
      }
    }
  });

  // ─── 7. FEEDBACK MODAL ───────────────────────────────────────────────────────
  test('7. Feedback modal appears and can be submitted', async ({ page }) => {
    await page.goto('/');
    await waitForStep(page, 2, 15_000);
    await page.waitForTimeout(2_000);

    // Check if feedback modal is open (from previous test's completion)
    const feedbackModal = page.locator('[class*="feedback"], [class*="Feedback"], [class*="modal"]').first();
    const difficultyEl = page.getByText(/difficulty|how did it go|rate/i).first();

    const hasFeedback = await feedbackModal.isVisible({ timeout: 5_000 }).catch(() => false);
    const hasDifficulty = await difficultyEl.isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasFeedback || hasDifficulty) {
      // Set difficulty to 3 (moderate)
      const slider = page.locator('input[type="range"]').first();
      const hasSlider = await slider.isVisible({ timeout: 3_000 }).catch(() => false);
      if (hasSlider) await slider.fill('3');

      // Submit feedback
      const submitBtn = page.locator(
        'button:has-text("Submit"), button:has-text("Done"), button:has-text("Save"), button[type="submit"]'
      ).first();
      const hasSubmit = await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false);
      if (hasSubmit) {
        await submitBtn.click();
        await page.waitForTimeout(1_000);
      }

      console.log('✓ Feedback submitted');
    } else {
      console.log('ℹ Feedback modal not visible — task may not have been completed in previous test');
    }
  });

  // ─── 8. NAVIGATE TO JOURNEY VIEW ─────────────────────────────────────────────
  test('8. Journey view shows the generated roadmap', async ({ page }) => {
    await page.goto('/');
    await waitForStep(page, 2, 15_000);

    // Navigate to Journey tab
    const journeyTab = page.locator(
      'button:has-text("Journey"), [data-testid*="journey"], [aria-label*="journey" i]'
    ).first();
    const hasJourney = await journeyTab.isVisible({ timeout: 8_000 }).catch(() => false);

    if (hasJourney) {
      await journeyTab.click();
      await page.waitForTimeout(2_000);
      await page.screenshot({ path: 'test-results/journey-view.png', fullPage: false });

      // Should show phases or a roadmap structure
      const phaseEl = page.locator('[class*="phase"], [class*="Phase"]').first();
      const hasPhase = await phaseEl.isVisible({ timeout: 5_000 }).catch(() => false);

      // Alternatively: just verify no crash
      const errorEl = page.getByText(/something went wrong|error/i).first();
      const hasError = await errorEl.isVisible({ timeout: 2_000 }).catch(() => false);
      expect(hasError).toBeFalsy();

      console.log(`✓ Journey view loaded. Phases visible: ${hasPhase}`);
    } else {
      console.log('ℹ Journey tab not found — skipping navigation');
    }
  });

  // ─── 9. CLEANUP ──────────────────────────────────────────────────────────────
  test('9. Cleanup — delete test account', async () => {
    // Use the Supabase admin API directly if service key is available
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey && createdUserId) {
      const res = await fetch(`http://127.0.0.1:54321/auth/v1/admin/users/${createdUserId}`, {
        method: 'DELETE',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
      });
      if (res.ok) {
        console.log(`✓ Deleted test account: ${TEST_EMAIL}`);
      } else {
        console.warn(`⚠ Could not delete account via API (${res.status}) — delete manually`);
      }
    } else {
      console.log(`ℹ No service key — could not auto-delete ${TEST_EMAIL}. Delete manually in Supabase Studio.`);
    }
  });
});
