/**
 * Unit tests for validated micro-scales — deterministic scoring of stone severity.
 *
 * These lock the property that matters: a scale-backed stone's severity is a
 * reproducible function of the responses, not an LLM label.
 *
 * Run: npm test
 */

import { describe, it, expect } from 'vitest';
import {
  scoreScale,
  severityFromNormalized,
  lowConfidenceSeverityFromRuler,
  SCALE_BACKED_STONES,
  SCALES,
} from '../scales';

describe('scoreScale — GSE3 (reverse-scored efficacy → LowConfidence)', () => {
  it('high self-efficacy answers → Low blocker severity', () => {
    // all 4s on efficacy items = maximum efficacy = minimum LowConfidence
    const r = scoreScale('GSE3', [4, 4, 4]);
    expect(r).not.toBeNull();
    expect(r!.stone).toBe('LowConfidence');
    expect(r!.normalized).toBe(0);
    expect(r!.severity).toBe('Low');
  });

  it('low self-efficacy answers → Critical blocker severity', () => {
    const r = scoreScale('GSE3', [1, 1, 1]);
    expect(r!.normalized).toBe(1);
    expect(r!.severity).toBe('Critical');
  });
});

describe('scoreScale — PPS3 / PFAI4 (forward-scored blockers)', () => {
  it('high procrastination answers → high severity', () => {
    const r = scoreScale('PPS3', [4, 4, 4]);
    expect(r!.stone).toBe('ProcrastinationPattern');
    expect(r!.normalized).toBe(1);
    expect(r!.severity).toBe('Critical');
  });

  it('low fear-of-failure answers → low severity', () => {
    const r = scoreScale('PFAI4', [1, 1, 1, 1]);
    expect(r!.stone).toBe('FearOfFailure');
    expect(r!.normalized).toBe(0);
    expect(r!.severity).toBe('Low');
  });

  it('mid answers land in a middle band', () => {
    const r = scoreScale('PFAI4', [2, 3, 2, 3]); // mean 2.5 on 1–4 → normalized 0.5
    expect(r!.normalized).toBeCloseTo(0.5, 1);
    expect(r!.severity).toBe('Moderate');
  });
});

describe('scoreScale — robustness', () => {
  it('clamps out-of-range responses', () => {
    const r = scoreScale('PPS3', [9, 9, 9]); // clamped to 4
    expect(r!.normalized).toBe(1);
  });

  it('scores only the items present when responses are short', () => {
    const r = scoreScale('PFAI4', [4]); // single item, max → normalized 1
    expect(r!.normalized).toBe(1);
  });

  it('returns null for empty responses', () => {
    expect(scoreScale('GSE3', [])).toBeNull();
  });

  it('is deterministic — same input, same output', () => {
    const a = scoreScale('PPS3', [3, 2, 4]);
    const b = scoreScale('PPS3', [3, 2, 4]);
    expect(a).toEqual(b);
  });
});

describe('severityFromNormalized — band thresholds', () => {
  it('maps the four bands', () => {
    expect(severityFromNormalized(0.2)).toBe('Low');
    expect(severityFromNormalized(0.5)).toBe('Moderate');
    expect(severityFromNormalized(0.7)).toBe('High');
    expect(severityFromNormalized(0.95)).toBe('Critical');
  });
});

describe('lowConfidenceSeverityFromRuler — the 1–10 onboarding ruler', () => {
  it('low efficacy (1–2) → High/Critical LowConfidence', () => {
    expect(lowConfidenceSeverityFromRuler(1)).toBe('Critical');
    expect(['High', 'Critical']).toContain(lowConfidenceSeverityFromRuler(2));
  });

  it('high efficacy (9–10) → Low LowConfidence', () => {
    expect(lowConfidenceSeverityFromRuler(10)).toBe('Low');
    expect(lowConfidenceSeverityFromRuler(9)).toBe('Low');
  });

  it('neutral midpoint (5–6) → null (no measured signal, defer to LLM)', () => {
    expect(lowConfidenceSeverityFromRuler(5)).toBeNull();
    expect(lowConfidenceSeverityFromRuler(6)).toBeNull();
  });
});

describe('SCALE_BACKED_STONES — honest "measured vs inferred" set', () => {
  it('contains exactly the stones with a scale', () => {
    expect(SCALE_BACKED_STONES.has('LowConfidence')).toBe(true);
    expect(SCALE_BACKED_STONES.has('ProcrastinationPattern')).toBe(true);
    expect(SCALE_BACKED_STONES.has('FearOfFailure')).toBe(true);
    expect(SCALE_BACKED_STONES.has('TimeConstraint')).toBe(false);
    expect(SCALE_BACKED_STONES.size).toBe(Object.keys(SCALES).length);
  });
});
