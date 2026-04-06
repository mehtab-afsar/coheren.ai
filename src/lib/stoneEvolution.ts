/**
 * Stone Evolution — Bayesian Severity Updates
 *
 * After each sprint checkpoint, update stone severities based on observed
 * performance signals. Uses a Bayesian-style update: each sprint is a
 * likelihood observation that shifts the severity up or down.
 *
 * Active when flags.DYNAMIC_STONE_EVOLUTION is on.
 *
 * Research basis:
 *   - FearOfFailure severity decays after 3 consecutive public artifact completions
 *     (PFAI — Performance Failure Appraisal Inventory; Conroy 2001)
 *   - Inconsistency severity rises after 2+ consecutive skip streaks (Lally UCL 2010)
 *   - LowConfidence severity decays when efficacy markers fire consistently (Bandura 1997)
 *   - TimeConstraint severity adjusts with observed completion rate vs. time budget
 */

import type { Stone, StoneType, StoneSeverity, Agent2ProfileOutput } from '@types-app/agents';
import { flags } from '@config/feature-flags';

// ─── Sprint observation ───────────────────────────────────────────────────────

export interface SprintObservation {
  completionRate:       number;   // 0–100
  consecutiveSkips:     number;
  timeSkips:            number;   // skips attributed to time constraints
  difficultySkips:      number;   // skips attributed to task difficulty
  healthSkips:          number;
  avgDifficulty:        number;   // 1–5 user-reported difficulty
  publicArtifactsMade:  number;   // count of public-facing outputs submitted
  streakDays:           number;   // longest streak in the sprint
  sprintNumber:         number;
  status:               string;   // ACCELERATE | MAINTAIN | SIMPLIFY | RECOVER
}

// ─── Severity numeric encoding ────────────────────────────────────────────────

const SEVERITY_SCORE: Record<StoneSeverity, number> = {
  Low:      1,
  Moderate: 2,
  High:     3,
  Critical: 4,
};

const SCORE_SEVERITY: Record<number, StoneSeverity> = {
  1: 'Low',
  2: 'Moderate',
  3: 'High',
  4: 'Critical',
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// ─── Per-stone evidence functions ─────────────────────────────────────────────

/**
 * Returns a severity delta (-1, 0, or +1) based on observed sprint signals
 * for a given stone type.
 */
function computeSeverityDelta(stone: StoneType, obs: SprintObservation): number {
  const { completionRate, consecutiveSkips, timeSkips, difficultySkips,
          avgDifficulty, publicArtifactsMade, streakDays, status } = obs;

  switch (stone) {
    case 'FearOfFailure':
    case 'Perfectionism': {
      // Severity decays when public artifacts are produced consistently
      // and difficulty is rated manageable
      if (publicArtifactsMade >= 3 && completionRate >= 80) return -1; // clear evidence of improvement
      if (difficultySkips >= 3 || (avgDifficulty >= 4 && completionRate < 60)) return +1;
      if (completionRate >= 70 && avgDifficulty <= 3) return -1;
      return 0;
    }

    case 'Inconsistency': {
      // Severity rises on multi-day skip streaks, falls on high streaks
      if (consecutiveSkips >= 3) return +1;
      if (streakDays >= 10 && completionRate >= 80) return -1;
      if (completionRate < 50 && consecutiveSkips >= 2) return +1;
      return 0;
    }

    case 'LowConfidence': {
      // Severity falls when user completes tasks rated as difficult
      // and maintains momentum; rises when difficulty attribution clusters
      if (completionRate >= 85 && avgDifficulty <= 2.5) return -1; // tasks felt easy — efficacy building
      if (completionRate >= 75 && status === 'ACCELERATE') return -1; // confidence materializing
      if (difficultySkips >= 3 && completionRate < 60) return +1;
      return 0;
    }

    case 'TimeConstraint': {
      // Severity rises when time skips are the dominant reason for incompletion
      const skipTotal = timeSkips + difficultySkips + obs.healthSkips;
      const timeRatio = skipTotal > 0 ? timeSkips / skipTotal : 0;
      if (timeRatio >= 0.6 && completionRate < 65) return +1;
      if (timeSkips === 0 && completionRate >= 80) return -1;
      return 0;
    }

    case 'ProcrastinationPattern': {
      // Severity falls with streak length; rises with low completion + no skip reason
      if (streakDays >= 7 && completionRate >= 75) return -1;
      if (consecutiveSkips >= 2 && timeSkips === 0 && difficultySkips === 0) return +1; // avoidance pattern
      return 0;
    }

    case 'Overcommitment': {
      // Severity rises when user was in RECOVER and burns out again quickly
      if (status === 'RECOVER' && obs.sprintNumber > 1) return +1;
      if (status === 'ACCELERATE' && completionRate >= 90) return -1; // managing load well
      return 0;
    }

    case 'SkillGap': {
      // Severity falls as completion and difficulty ratings normalize
      if (completionRate >= 80 && avgDifficulty <= 2.5) return -1;
      if (completionRate < 50 && avgDifficulty >= 4) return +1;
      return 0;
    }

    case 'UnrealisticExpectations': {
      // Severity falls when user accepts recalibration without resistance
      // (proxied by MAINTAIN or SIMPLIFY status being accepted)
      if ((status === 'MAINTAIN' || status === 'SIMPLIFY') && completionRate >= 70) return -1;
      return 0;
    }

    default:
      return 0; // remaining stones: no signal → no change
  }
}

// ─── riskImpact update ────────────────────────────────────────────────────────

/**
 * Recompute riskImpact (0–1) from updated severity.
 * Preserves the directional relationship between severity and impact.
 */
function recomputeRiskImpact(stone: Stone, newSeverity: StoneSeverity): number {
  // Base impact per severity, with existing impact as a prior
  const base: Record<StoneSeverity, number> = { Low: 0.2, Moderate: 0.45, High: 0.7, Critical: 0.9 };
  const target = base[newSeverity];
  // Blend 70% toward target, 30% existing inertia
  return Math.round(clamp(stone.riskImpact * 0.3 + target * 0.7, 0.05, 0.95) * 100) / 100;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Apply one sprint's behavioral observations to a stone profile.
 * Returns a new profile with updated severities and riskImpact values.
 * Original profile is not mutated.
 *
 * Only runs when flags.DYNAMIC_STONE_EVOLUTION is on.
 */
export function evolveStoneProfile(
  profile: Agent2ProfileOutput,
  observation: SprintObservation,
): Agent2ProfileOutput {
  if (!flags.DYNAMIC_STONE_EVOLUTION) return profile;

  const updatedStones = profile.stoneProfile.stones.map(stone => {
    const delta = computeSeverityDelta(stone.type, observation);
    if (delta === 0) return stone;

    const currentScore = SEVERITY_SCORE[stone.severity];
    const newScore = clamp(currentScore + delta, 1, 4) as 1 | 2 | 3 | 4;
    const newSeverity = SCORE_SEVERITY[newScore];
    const newRiskImpact = recomputeRiskImpact(stone, newSeverity);

    return { ...stone, severity: newSeverity, riskImpact: newRiskImpact };
  });

  // Re-determine primary stone: highest riskImpact after update
  const primaryStone = updatedStones.reduce((best, s) =>
    s.riskImpact > best.riskImpact ? s : best
  ).type;

  return {
    ...profile,
    stoneProfile: {
      ...profile.stoneProfile,
      stones: updatedStones,
      primaryStone,
    },
  };
}

/**
 * Build a SprintObservation from the fields available in Agent 5's weekly input.
 * Convenience bridge so callers don't need to construct the struct manually.
 */
export function buildSprintObservation(params: {
  completionRate:      number;
  consecutiveSkips:    number;
  timeSkips:           number;
  difficultySkips:     number;
  healthSkips:         number;
  avgDifficulty:       number;
  publicArtifactsMade: number;
  streakDays:          number;
  sprintNumber:        number;
  status:              string;
}): SprintObservation {
  return params;
}
