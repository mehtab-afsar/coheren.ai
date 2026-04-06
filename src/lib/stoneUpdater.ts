/**
 * Bayesian Stone Updater (AI Quality — Item 5)
 *
 * Pure function — no store writes, no side effects.
 *
 * After each weekly checkpoint, call `updateStoneSeverities()` to nudge
 * each stone's `riskImpact` based on that sprint's behavioral evidence.
 * Severity is re-derived from the updated riskImpact.
 *
 * Update rule:
 *   evidenceStrength = clamp(signalCount / totalTasks, 0, 1)
 *   delta = baseDirection * evidenceStrength * 0.1   (conservative sprint weight)
 *   newRiskImpact = clamp(oldRiskImpact + delta, 0, 1)
 */

import type { Agent2ProfileOutput, CompletedTaskFeedback, StoneSeverity, StoneType } from '@types-app/agents';

// ─── Severity derivation ──────────────────────────────────────────────────────

function deriveSeverity(riskImpact: number): StoneSeverity {
  if (riskImpact >= 0.8) return 'Critical';
  if (riskImpact >= 0.6) return 'High';
  if (riskImpact >= 0.3) return 'Moderate';
  return 'Low';
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

// ─── Evidence per stone ───────────────────────────────────────────────────────

interface EvidenceSignal {
  /** Negative = good evidence (stone resolving) → riskImpact decreases */
  direction: -1 | 0 | 1;
  signalCount: number;
}

function computeEvidence(
  stoneType: StoneType,
  tasks: CompletedTaskFeedback[],
): EvidenceSignal {
  const total = tasks.length;
  if (total === 0) return { direction: 0, signalCount: 0 };

  const completedCount = tasks.filter(t => !t.skipped).length;
  const skippedCount   = tasks.filter(t => t.skipped).length;
  const completionRate = (completedCount / total) * 100;
  const difficultySkips = tasks.filter(t => t.skipped && t.skipReason === 'difficulty').length;
  const timeSkips       = tasks.filter(t => t.skipped && t.skipReason === 'time').length;
  const lowDifficultyCount = tasks.filter(t => !t.skipped && t.difficultyRating <= 2).length;
  const highDifficultyCount = tasks.filter(t => !t.skipped && t.difficultyRating >= 4).length;

  switch (stoneType) {
    case 'ProcrastinationPattern': {
      // Positive signal: completed (not skipped). Negative: any skip.
      if (completedCount > skippedCount) return { direction: -1, signalCount: completedCount };
      if (skippedCount > 0)              return { direction:  1, signalCount: skippedCount };
      return { direction: 0, signalCount: 0 };
    }

    case 'Inconsistency': {
      if (completionRate > 70) return { direction: -1, signalCount: completedCount };
      if (completionRate < 50) return { direction:  1, signalCount: skippedCount };
      return { direction: 0, signalCount: 0 };
    }

    case 'FearOfFailure': {
      // Positive: completed without difficulty-skip. Negative: difficulty skip.
      if (difficultySkips === 0 && completedCount > 0) return { direction: -1, signalCount: completedCount };
      if (difficultySkips > 0)                         return { direction:  1, signalCount: difficultySkips };
      return { direction: 0, signalCount: 0 };
    }

    case 'TimeConstraint': {
      // Positive: completed on time. Negative: time skip.
      if (completedCount > 0 && timeSkips === 0) return { direction: -1, signalCount: completedCount };
      if (timeSkips > 0)                          return { direction:  1, signalCount: timeSkips };
      return { direction: 0, signalCount: 0 };
    }

    case 'LowConfidence': {
      // Positive: difficulty rated low (≤2 = felt easy = gaining confidence).
      // Negative: difficulty rated high (≥4).
      if (lowDifficultyCount > highDifficultyCount) return { direction: -1, signalCount: lowDifficultyCount };
      if (highDifficultyCount > lowDifficultyCount) return { direction:  1, signalCount: highDifficultyCount };
      return { direction: 0, signalCount: 0 };
    }

    case 'SkillGap': {
      // Positive: difficulty trending down sprint-over-sprint (avg < 3).
      // Negative: difficulty persists high.
      const avgDifficulty = tasks
        .filter(t => !t.skipped && t.difficultyRating != null)
        .reduce((s, t) => s + t.difficultyRating, 0) / Math.max(1, completedCount);
      if (avgDifficulty < 3)  return { direction: -1, signalCount: completedCount };
      if (highDifficultyCount >= 3) return { direction: 1, signalCount: highDifficultyCount };
      return { direction: 0, signalCount: 0 };
    }

    case 'Perfectionism': {
      // Positive: completed within 1.4× time budget.
      // Negative: overtime (completionTime > budget * 1.4).
      // We don't have the budget in CompletedTaskFeedback, so use ratio heuristic:
      // tasks with completionTime > 0 and completionTime < 120 (reasonable bound).
      const overtimeTasks = tasks.filter(t => !t.skipped && t.completionTime > 90).length;
      const onTimeTasks   = tasks.filter(t => !t.skipped && t.completionTime > 0 && t.completionTime <= 90).length;
      if (onTimeTasks > overtimeTasks) return { direction: -1, signalCount: onTimeTasks };
      if (overtimeTasks > 0)           return { direction:  1, signalCount: overtimeTasks };
      return { direction: 0, signalCount: 0 };
    }

    default: {
      // All other stones: passive slow decay (up to -0.05 total over time)
      return { direction: -1, signalCount: 1 };
    }
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface StoneHistoryEntry {
  sprintNumber: number;
  updatedAt: string; // ISO8601
  stones: Array<{ type: StoneType; riskImpact: number; severity: StoneSeverity }>;
}

// ─── Resolution threshold (Change 4) ─────────────────────────────────────────

/** Minimum riskImpact to keep a stone in the active profile (below = resolved). */
const RESOLUTION_THRESHOLD = 0.2;

/**
 * Detect emerging stones from task skip patterns.
 * Returns stone types not in existingTypes that should be added at riskImpact 0.4.
 */
function detectEmergingStones(
  completedTasks: CompletedTaskFeedback[],
  existingTypes: StoneType[],
): StoneType[] {
  const total = completedTasks.length;
  if (total < 5) return []; // not enough data to detect emergence

  const skippedCount    = completedTasks.filter(t => t.skipped).length;
  const timeSkips       = completedTasks.filter(t => t.skipped && t.skipReason === 'time').length;
  const difficultySkips = completedTasks.filter(t => t.skipped && t.skipReason === 'difficulty').length;
  const healthSkips     = completedTasks.filter(t => t.skipped && t.skipReason === 'health').length;
  const consecutiveSkips = (() => {
    let max = 0, current = 0;
    for (const t of completedTasks) {
      if (t.skipped) { current++; max = Math.max(max, current); } else current = 0;
    }
    return max;
  })();

  const emerging: StoneType[] = [];

  // TimeConstraint emerges if >40% of skips are time-related
  if (!existingTypes.includes('TimeConstraint') && timeSkips / total > 0.3) {
    emerging.push('TimeConstraint');
  }
  // Inconsistency emerges if long consecutive skip streaks appear
  if (!existingTypes.includes('Inconsistency') && consecutiveSkips >= 4) {
    emerging.push('Inconsistency');
  }
  // FearOfFailure emerges if difficulty skips are high proportion of all skips
  if (!existingTypes.includes('FearOfFailure') && skippedCount > 0 && difficultySkips / skippedCount > 0.5 && difficultySkips >= 2) {
    emerging.push('FearOfFailure');
  }
  // Overcommitment emerges if overall skip rate is very high (>50%)
  if (!existingTypes.includes('Overcommitment') && skippedCount / total > 0.5) {
    emerging.push('Overcommitment');
  }
  // Health-related stone if health skips are significant
  if (!existingTypes.includes('EnvironmentFriction') && healthSkips / total > 0.25) {
    emerging.push('EnvironmentFriction');
  }

  return emerging;
}

/**
 * Update stone severities based on the latest sprint's behavioral evidence.
 *
 * @param stoneProfile  Current stone profile from Zustand store
 * @param completedTasks  All completed/skipped tasks in this sprint
 * @param sprintNumber  Current sprint number (used for decay rate cap)
 * @param options.withEvolution  If true (DYNAMIC_STONE_EVOLUTION flag), apply stone
 *   resolution (remove riskImpact < 0.2) and emergence (add new stones from patterns).
 *   Requires prevHistory to determine if stone was low for 2 consecutive sprints.
 * @param options.prevHistory  Previous sprint's stone snapshot for resolution tracking
 * @returns  Updated stone profile (new object — no mutation)
 */
export function updateStoneSeverities(
  stoneProfile: Agent2ProfileOutput,
  completedTasks: CompletedTaskFeedback[],
  sprintNumber: number,
  options?: {
    withEvolution?: boolean;
    prevHistory?: StoneHistoryEntry;
  },
): Agent2ProfileOutput {
  if (completedTasks.length === 0) return stoneProfile;

  const total = completedTasks.length;
  // Slow decay cap: -0.01 per sprint, max -0.05 total for non-mapped stones
  const decayCap = Math.min(0.05, 0.01 * sprintNumber);
  const withEvolution = options?.withEvolution ?? false;
  const prevHistory   = options?.prevHistory;

  // Determine which stones were already below threshold last sprint (for resolution)
  const prevLowStones = new Set<string>(
    prevHistory?.stones
      .filter(s => s.riskImpact < RESOLUTION_THRESHOLD)
      .map(s => s.type) ?? []
  );

  let updatedStones = stoneProfile.stoneProfile.stones.map(stone => {
    const { direction, signalCount } = computeEvidence(stone.type, completedTasks);

    let delta: number;
    if (direction === 0) {
      delta = 0;
    } else if (direction === -1 && signalCount === 1 && !['ProcrastinationPattern', 'Inconsistency', 'FearOfFailure', 'TimeConstraint', 'LowConfidence', 'SkillGap', 'Perfectionism'].includes(stone.type)) {
      // Passive decay for unmapped stones
      delta = -Math.min(0.001, decayCap / 10);
    } else {
      const evidenceStrength = clamp(signalCount / total, 0, 1);
      delta = direction * evidenceStrength * 0.1;
    }

    const newRiskImpact = clamp(stone.riskImpact + delta, 0, 1);
    const newSeverity = deriveSeverity(newRiskImpact);

    return { ...stone, riskImpact: newRiskImpact, severity: newSeverity };
  });

  // Stone resolution (Change 4) — remove stones below threshold for 2 consecutive sprints
  if (withEvolution) {
    updatedStones = updatedStones.filter(stone => {
      const isResolved = stone.riskImpact < RESOLUTION_THRESHOLD && prevLowStones.has(stone.type);
      if (isResolved) {
        console.debug(`[StoneUpdater] Resolved stone: ${stone.type} (riskImpact ${stone.riskImpact.toFixed(2)})`);
      }
      return !isResolved;
    });
  }

  // Stone emergence (Change 4) — detect new patterns and add emerging stones
  if (withEvolution) {
    const existingTypes = updatedStones.map(s => s.type);
    const emerging = detectEmergingStones(completedTasks, existingTypes);
    for (const stoneType of emerging) {
      console.debug(`[StoneUpdater] Emerging stone detected: ${stoneType}`);
      updatedStones.push({
        type:       stoneType,
        severity:   'Moderate',
        riskImpact: 0.4,
        description: `Detected from sprint ${sprintNumber} behavioral patterns`,
        category:   'Behavioural',
        trigger:    'Sprint behavioral patterns',
        manifests:   [],
        agent3Guidance: '',
        agent5Note:  '',
      } as import('@types-app/agents').Stone);
    }
  }

  // Recalculate primaryStone as highest riskImpact
  const sorted = [...updatedStones].sort((a, b) => b.riskImpact - a.riskImpact);
  const newPrimary = sorted[0]?.type ?? stoneProfile.stoneProfile.primaryStone;

  return {
    stoneProfile: {
      ...stoneProfile.stoneProfile,
      primaryStone: newPrimary,
      stones: updatedStones,
    },
  };
}
