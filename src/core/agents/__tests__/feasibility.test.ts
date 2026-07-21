/**
 * Unit tests for assessFeasibility — the deterministic time-to-competence anchor.
 *
 * assessFeasibility is a pure function: (goalText, timelineDays, dailyMinutes) →
 * a verdict computed from days×minutes vs an hours-to-competence table. These tests
 * lock the verdicts that must hold regardless of LLM mood.
 *
 * Run: npm test
 */

import { describe, it, expect } from 'vitest';
import { assessFeasibility } from '@core/agents/feasibility';

describe('assessFeasibility — fantasy timelines are unrealistic deterministically', () => {
  it('flags "fluent Japanese in 2 weeks @10min" as unrealistic + offers a rescope', () => {
    const r = assessFeasibility({ goalText: 'become fluent in Japanese', timelineDays: 14, dailyMinutes: 10 });
    expect(r.verdict).toBe('unrealistic');
    expect(r.availableHours).toBeLessThan(5);
    expect(r.rescopedGoalSuggestion).toBeTruthy();
    expect(r.skillLabel).toBe('a new language');
  });

  it('flags a marathon in 3 weeks @20min as unrealistic', () => {
    const r = assessFeasibility({ goalText: 'run a marathon', timelineDays: 21, dailyMinutes: 20 });
    expect(r.verdict).toBe('unrealistic');
  });
});

describe('assessFeasibility — reasonable plans clear the bar', () => {
  it('language over a year at an hour a day is comfortable', () => {
    const r = assessFeasibility({ goalText: 'learn Spanish', timelineDays: 365, dailyMinutes: 60 });
    expect(r.verdict).toBe('comfortable');
    expect(r.rescopedGoalSuggestion).toBeUndefined();
  });

  it('a fitness habit at 30min/day for 4 months is comfortable', () => {
    // 120 days × 30min = 60h vs a 60h fitness anchor → ratio 1.0
    const r = assessFeasibility({ goalText: 'get fit and build muscle', timelineDays: 120, dailyMinutes: 30 });
    expect(r.verdict).toBe('comfortable');
  });
});

describe('assessFeasibility — the middle band is tight', () => {
  it('rates a mid-range ratio as tight (not comfortable, not unrealistic)', () => {
    // programming needs ~200h; 60 days × 60min = 60h → ratio 0.3 (unrealistic),
    // so bump to 120 days × 90min = 180h → ratio 0.9 (comfortable). Target ~0.5:
    // 90 days × 60min = 90h → ratio 0.45 → tight.
    const r = assessFeasibility({ goalText: 'learn to code in Python', timelineDays: 90, dailyMinutes: 60 });
    expect(r.verdict).toBe('tight');
    expect(r.skillLabel).toBe('programming');
  });
});

describe('assessFeasibility — unknown goals use the default anchor', () => {
  it('falls back to the default band for an unmatched goal', () => {
    const r = assessFeasibility({ goalText: 'become a better parent', timelineDays: 30, dailyMinutes: 15 });
    expect(r.requiredHours).toBe(120); // DEFAULT_BAND
    expect(r.skillLabel).toBe('this skill');
  });
});

describe('assessFeasibility — numeric fields are well-formed', () => {
  it('computes availableHours = days × minutes / 60, rounded', () => {
    const r = assessFeasibility({ goalText: 'learn guitar', timelineDays: 30, dailyMinutes: 60 });
    expect(r.availableHours).toBe(30); // 30 × 60 / 60
    expect(r.ratio).toBeCloseTo(30 / 120, 2);
  });

  it('never returns a negative ratio or hours', () => {
    const r = assessFeasibility({ goalText: 'anything', timelineDays: 0, dailyMinutes: 0 });
    expect(r.availableHours).toBe(0);
    expect(r.ratio).toBe(0);
    expect(r.verdict).toBe('unrealistic');
  });
});
