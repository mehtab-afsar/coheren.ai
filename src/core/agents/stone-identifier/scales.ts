/**
 * Validated micro-scales — the measured half of the stone profile.
 *
 * The stone type + severity used to be *entirely* LLM inference. This module makes
 * a subset of them **measured**: short, validated psychometric instruments scored
 * deterministically in code, so a scale-backed stone's severity is a number, not a
 * mood. Un-scaled stones stay LLM-inferred (and the copy says so — see
 * `SCALE_BACKED_STONES`).
 *
 * Instruments (short forms, keyed to the stone they measure):
 *   - GSE-3   → LowConfidence      (General Self-Efficacy, Schwarzer & Jerusalem 1995)
 *   - PPS-3   → ProcrastinationPattern (Pure Procrastination Scale, Steel 2010)
 *   - PFAI-4  → FearOfFailure      (Performance Failure Appraisal Inventory, Conroy 2001)
 *
 * All items are Likert 1–4 (Not at all true → Exactly true) unless noted. Scoring is
 * mean-based → normalized 0–1 → severity band. Higher normalized = stronger blocker.
 * The self-efficacy ruler already collected in onboarding (1–10) also maps here so we
 * don't have to re-administer GSE to get a real LowConfidence severity.
 */

import type { StoneType, StoneSeverity } from '@types-app/agents';

// ─── Item banks ────────────────────────────────────────────────────────────────

export interface ScaleItem {
  id: string;
  text: string;
  /** true when a HIGH answer means MORE self-efficacy/capability (reverse-scored for a blocker). */
  reverse?: boolean;
}

export interface Scale {
  id: ScaleId;
  name: string;
  citation: string;
  stone: StoneType;
  min: number;   // per-item min (Likert floor)
  max: number;   // per-item max (Likert ceiling)
  items: ScaleItem[];
}

export type ScaleId = 'GSE3' | 'PPS3' | 'PFAI4';

export const SCALES: Record<ScaleId, Scale> = {
  // General Self-Efficacy — 3-item short form. HIGH score = high efficacy = LOW blocker,
  // so every item is reverse-scored relative to the LowConfidence stone.
  GSE3: {
    id: 'GSE3',
    name: 'General Self-Efficacy (short)',
    citation: 'Schwarzer & Jerusalem 1995',
    stone: 'LowConfidence',
    min: 1,
    max: 4,
    items: [
      { id: 'gse1', text: 'I can usually handle whatever comes my way.', reverse: true },
      { id: 'gse2', text: 'If I try hard enough, I can solve difficult problems.', reverse: true },
      { id: 'gse3', text: 'I stay calm facing difficulties because I trust my ability to cope.', reverse: true },
    ],
  },

  // Pure Procrastination Scale — 3 representative items (irrational delay).
  PPS3: {
    id: 'PPS3',
    name: 'Pure Procrastination (short)',
    citation: 'Steel 2010',
    stone: 'ProcrastinationPattern',
    min: 1,
    max: 4,
    items: [
      { id: 'pps1', text: 'I delay making decisions until it is too late.' },
      { id: 'pps2', text: '"I\'ll do it later" is something I say and then regret.' },
      { id: 'pps3', text: 'I put things off so long that they get done in a rush at the end.' },
    ],
  },

  // Performance Failure Appraisal Inventory — 4 items (fear of shame / judgment).
  PFAI4: {
    id: 'PFAI4',
    name: 'Fear of Failure (short)',
    citation: 'Conroy 2001',
    stone: 'FearOfFailure',
    min: 1,
    max: 4,
    items: [
      { id: 'pfai1', text: 'When I fail, I worry about what others think of me.' },
      { id: 'pfai2', text: 'When I fail, I feel less valuable than when I succeed.' },
      { id: 'pfai3', text: 'I avoid situations where I might visibly fail.' },
      { id: 'pfai4', text: 'When I imagine failing, I feel a knot of dread that stops me starting.' },
    ],
  },
};

/** Stones for which a validated scale exists — used for honest "measured vs inferred" copy. */
export const SCALE_BACKED_STONES: ReadonlySet<StoneType> = new Set(
  Object.values(SCALES).map(s => s.stone),
);

// ─── Scoring ─────────────────────────────────────────────────────────────────

export interface ScaleResult {
  scaleId: ScaleId;
  stone: StoneType;
  /** Mean item score on the raw Likert scale. */
  rawMean: number;
  /** 0–1 where 1 = strongest presence of the blocker (reverse items already flipped). */
  normalized: number;
  severity: StoneSeverity;
}

/**
 * Map a 0–1 blocker-strength to a severity band.
 * Thresholds: <0.35 Low, <0.6 Moderate, <0.85 High, else Critical.
 */
export function severityFromNormalized(normalized: number): StoneSeverity {
  const n = Math.min(1, Math.max(0, normalized));
  if (n < 0.35) return 'Low';
  if (n < 0.6) return 'Moderate';
  if (n < 0.85) return 'High';
  return 'Critical';
}

/**
 * Score a validated scale from per-item Likert responses (in item order).
 * Reverse-scored items are flipped so that `normalized` always means
 * "strength of the blocker". Missing/short responses score the items present.
 */
export function scoreScale(scaleId: ScaleId, responses: number[]): ScaleResult | null {
  const scale = SCALES[scaleId];
  if (!scale || responses.length === 0) return null;

  const span = scale.max - scale.min;
  const n = Math.min(responses.length, scale.items.length);
  let sumBlocker = 0;
  for (let i = 0; i < n; i++) {
    const raw = Math.min(scale.max, Math.max(scale.min, responses[i]));
    // Blocker-oriented value: reverse items (efficacy) flip so high efficacy = low blocker.
    const blocker = scale.items[i].reverse ? scale.max - (raw - scale.min) : raw;
    sumBlocker += blocker;
  }
  const meanBlocker = sumBlocker / n;
  const normalized = span > 0 ? (meanBlocker - scale.min) / span : 0;

  // rawMean reported on the original Likert (un-flipped) for transparency
  const rawMean =
    responses.slice(0, n).reduce((a, r) => a + Math.min(scale.max, Math.max(scale.min, r)), 0) / n;

  return {
    scaleId,
    stone: scale.stone,
    rawMean: Math.round(rawMean * 100) / 100,
    normalized: Math.round(normalized * 100) / 100,
    severity: severityFromNormalized(normalized),
  };
}

/**
 * Deterministic LowConfidence severity from the self-efficacy ruler already collected
 * in onboarding (1–10, higher = MORE efficacy). This lets us set a *measured* severity
 * for LowConfidence without re-administering GSE-3.
 *
 * Returns null for the neutral midpoint (5–6) so we don't override the LLM when the
 * ruler carries no signal either way.
 */
export function lowConfidenceSeverityFromRuler(selfEfficacy1to10: number): StoneSeverity | null {
  const v = Math.min(10, Math.max(1, selfEfficacy1to10));
  // Low efficacy → strong LowConfidence blocker. Invert to blocker-strength 0–1.
  const normalized = (10 - v) / 9;
  if (v === 5 || v === 6) return null; // neutral — no measured signal
  return severityFromNormalized(normalized);
}
