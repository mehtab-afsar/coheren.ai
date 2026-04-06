/**
 * Contextual Bandit — Thompson Sampling for task variant selection
 *
 * WHAT IT DOES
 * ─────────────
 * Instead of showing all 3 generated variants and asking the user to pick,
 * the bandit automatically selects the best variant based on each user's
 * personal history within a context (domain × primary stone × day-of-week bucket).
 *
 * Each arm (light / standard / deep) maintains a Beta(alpha, beta) distribution
 * representing the estimated probability that this variant leads to a successful,
 * well-matched completion. On each task generation we sample once from each arm
 * and pick the highest sample — this naturally balances exploration vs exploitation.
 *
 * REWARD SIGNAL
 * ─────────────
 * A variant "succeeded" if:
 *   - The task was completed (base condition)
 *   - AND the difficulty rating was 3/5 (just right) → reward 1.0
 *   - Completed but slightly off (2 or 4) → reward 0.8
 *   - Completed but very wrong difficulty (1 or 5) → reward 0.5
 *   - Not completed → reward 0.0
 *
 * PRIORS
 * ──────
 * Standard starts with a warm prior Beta(3, 1) — it's the safe default until
 * personal data arrives. Light and deep start at Beta(1.5, 1.5) — weakly optimistic.
 * After ~10 pulls the data dominates over the prior.
 */

export type VariantArm = 'light' | 'standard' | 'deep';

export interface ArmState {
  alpha: number; // pseudo-successes (updated by reward)
  beta:  number; // pseudo-failures  (updated by 1 - reward)
  pulls: number; // total observations
}

export type ArmMap = Record<VariantArm, ArmState>;

export interface BanditState {
  /** contextKey → per-arm Beta distribution parameters */
  arms: Record<string, ArmMap>;
  /** day number → which arm was auto-selected (for feedback lookup) */
  selections: Record<number, VariantArm>;
}

export interface BanditContext {
  domain:       string; // e.g. 'cognitive', 'kinesthetic'
  primaryStone: string; // e.g. 'TimeConstraint', 'Inconsistency'
  dayOfWeek:    number; // 0 (Sun) – 6 (Sat)
}

// ── Context key ───────────────────────────────────────────────────────────────

/**
 * Group days into 3 buckets to avoid sparsity early on.
 * As data accumulates the buckets naturally converge on stable estimates.
 */
function dayBucket(dow: number): string {
  if (dow === 0 || dow === 6) return 'weekend';
  if (dow <= 3)               return 'weekday-early';  // Mon–Wed
  return                              'weekday-late';   // Thu–Fri
}

export function getContextKey(ctx: BanditContext): string {
  return `${ctx.domain}|${ctx.primaryStone}|${dayBucket(ctx.dayOfWeek)}`;
}

// ── Priors ────────────────────────────────────────────────────────────────────

function defaultArms(): ArmMap {
  return {
    light:    { alpha: 1.5, beta: 1.5, pulls: 0 },
    standard: { alpha: 3.0, beta: 1.0, pulls: 0 }, // warm prior — safe default
    deep:     { alpha: 1.5, beta: 1.5, pulls: 0 },
  };
}

export function getInitialBanditState(): BanditState {
  return { arms: {}, selections: {} };
}

// ── Beta distribution sampling ────────────────────────────────────────────────

/**
 * Sample from Beta(alpha, beta) using the normal approximation.
 * Accurate when alpha + beta > 5 (true after a few pulls).
 * For the very first pulls (small params) this is slightly over-smooth,
 * which is fine — it prevents erratic early exploration.
 */
function sampleBeta(alpha: number, beta: number): number {
  const n    = alpha + beta;
  const mean = alpha / n;
  const variance = (alpha * beta) / (n * n * (n + 1));
  const std  = Math.sqrt(variance);

  // Box-Muller transform for standard normal
  const u1 = Math.max(1e-10, Math.random());
  const u2 = Math.random();
  const z  = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  return Math.max(0.01, Math.min(0.99, mean + std * z));
}

// ── Selection ─────────────────────────────────────────────────────────────────

/**
 * Thompson sample all three arms and return the one with the highest draw.
 * Automatically explores undersampled arms and exploits known-good ones.
 */
export function selectVariant(state: BanditState, ctx: BanditContext): VariantArm {
  const key  = getContextKey(ctx);
  const arms = state.arms[key] ?? defaultArms();

  const scores: [VariantArm, number][] = [
    ['light',    sampleBeta(arms.light.alpha,    arms.light.beta)],
    ['standard', sampleBeta(arms.standard.alpha, arms.standard.beta)],
    ['deep',     sampleBeta(arms.deep.alpha,     arms.deep.beta)],
  ];

  return scores.sort((a, b) => b[1] - a[1])[0][0];
}

// ── Reward computation ────────────────────────────────────────────────────────

/**
 * Translate task feedback into a [0–1] reward signal.
 *
 * The difficulty rating tells us whether the variant matched the user's
 * current capacity — not just whether they completed it.
 *   3 = "just right"  → perfect match → 1.0
 *   2 or 4            → slight mismatch → 0.8
 *   1 = too easy      → wrong variant, should have gone deeper → 0.5
 *   5 = too hard      → wrong variant, should have gone lighter → 0.5
 *   not completed     → 0.0 regardless of difficulty
 */
export function computeReward(completed: boolean, difficultyRating: number): number {
  if (!completed) return 0;
  if (difficultyRating === 3) return 1.0;
  if (difficultyRating === 2 || difficultyRating === 4) return 0.8;
  return 0.5; // 1 (too easy) or 5 (too hard)
}

// ── Update ────────────────────────────────────────────────────────────────────

/**
 * Update the Beta parameters for the arm that was pulled.
 * alpha grows with successful rewards; beta grows with failures.
 * Uses fractional updates (reward ∈ [0,1]) rather than strict 0/1
 * so partial successes (wrong difficulty but completed) still move the distribution.
 */
export function updateArm(
  state:   BanditState,
  ctx:     BanditContext,
  variant: VariantArm,
  reward:  number,       // 0–1 from computeReward()
): BanditState {
  const key  = getContextKey(ctx);
  const arms = state.arms[key] ?? defaultArms();
  const arm  = arms[variant];

  return {
    ...state,
    arms: {
      ...state.arms,
      [key]: {
        ...arms,
        [variant]: {
          alpha: arm.alpha + reward,
          beta:  arm.beta  + (1 - reward),
          pulls: arm.pulls + 1,
        },
      },
    },
  };
}

// ── Record selection ──────────────────────────────────────────────────────────

export function recordSelection(
  state:   BanditState,
  day:     number,
  variant: VariantArm,
): BanditState {
  return {
    ...state,
    selections: { ...state.selections, [day]: variant },
  };
}

// ── Debug / transparency ──────────────────────────────────────────────────────

/**
 * Returns the mean reward probability for each arm in a given context.
 * Use this to show users why a certain variant was chosen.
 */
export function getArmMeans(state: BanditState, ctx: BanditContext): Record<VariantArm, number> {
  const arms = state.arms[getContextKey(ctx)] ?? defaultArms();
  const mean = (a: ArmState) => a.alpha / (a.alpha + a.beta);
  return { light: mean(arms.light), standard: mean(arms.standard), deep: mean(arms.deep) };
}
