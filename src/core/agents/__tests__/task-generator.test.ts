/**
 * Unit tests for task-generator.ts pure-logic functions
 *
 * Tests: sanitizeResourceUrl, resolvePhaseForDay
 * No Groq calls — pure data transformation logic only.
 *
 * Run: npm test
 */

import { describe, it, expect } from 'vitest';
import { sanitizeResourceUrl, resolvePhaseForDay } from '@core/agents/task-generator';
import type { Phase } from '@types-app/agents';

// ─── sanitizeResourceUrl ─────────────────────────────────────────────────────

describe('sanitizeResourceUrl — placeholder detection', () => {
  it('converts Rick Astley placeholder to search URL', () => {
    const result = sanitizeResourceUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Run Walk Intervals');
    expect(result).toMatch(/youtube\.com\/results\?search_query=/);
    expect(result).toMatch(/run/);
  });

  it('converts second known placeholder (xvFZjo5PgG0)', () => {
    const result = sanitizeResourceUrl('https://www.youtube.com/watch?v=xvFZjo5PgG0', 'Beginner Strength Training');
    expect(result).toMatch(/youtube\.com\/results\?search_query=/);
    expect(result).toMatch(/beginner/);
  });

  it('converts VIDEO_ID placeholder', () => {
    const result = sanitizeResourceUrl('https://www.youtube.com/watch?v=VIDEO_ID', 'AWS Cloud Basics');
    expect(result).toMatch(/youtube\.com\/results\?search_query=/);
  });

  it('converts XXXXXXXXXX placeholder', () => {
    const result = sanitizeResourceUrl('https://www.youtube.com/watch?v=XXXXXXXXXX', 'Financial Planning');
    expect(result).toMatch(/youtube\.com\/results\?search_query=/);
  });
});

describe('sanitizeResourceUrl — passthrough cases', () => {
  it('keeps a valid non-placeholder YouTube watch URL unchanged', () => {
    const url = 'https://www.youtube.com/watch?v=BKorP55Aqvg';
    expect(sanitizeResourceUrl(url, 'Any Task')).toBe(url);
  });

  it('keeps an existing YouTube search URL unchanged', () => {
    const url = 'https://www.youtube.com/results?search_query=run+walk+intervals';
    expect(sanitizeResourceUrl(url, 'Any Task')).toBe(url);
  });

  it('keeps a non-YouTube URL unchanged', () => {
    const url = 'https://example.com/article';
    expect(sanitizeResourceUrl(url, 'Any Task')).toBe(url);
  });

  it('returns null for empty string', () => {
    expect(sanitizeResourceUrl('', 'Any Task')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(sanitizeResourceUrl('   ', 'Any Task')).toBeNull();
  });

  it('returns null for non-string input', () => {
    expect(sanitizeResourceUrl(null, 'Any Task')).toBeNull();
    expect(sanitizeResourceUrl(undefined, 'Any Task')).toBeNull();
    expect(sanitizeResourceUrl(42, 'Any Task')).toBeNull();
  });
});

describe('sanitizeResourceUrl — search query encoding', () => {
  it('URL-encodes special characters in the task title', () => {
    const result = sanitizeResourceUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Run & Walk: 5K Prep!');
    expect(result).toMatch(/youtube\.com\/results\?search_query=/);
    // The title characters !, &, : should not appear literally in the query param
    const queryPart = result?.split('search_query=')[1] ?? '';
    expect(queryPart).not.toMatch(/[!&:]/);
  });

  it('strips leading and trailing whitespace from title', () => {
    const result = sanitizeResourceUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '  run walk intervals  ');
    expect(result).toMatch(/run/);
  });
});

// ─── resolvePhaseForDay ───────────────────────────────────────────────────────

function makePhases(durations: number[]): Phase[] {
  return durations.map((d, i) => ({
    phaseNumber: i + 1,
    phaseName:   `Phase ${i + 1}`,
    durationDays: d,
    weeks:        [],
    primaryGoals: [],
    focusAreas:   {},
    keyMilestones: [],
    scienceRationale: '',
  }));
}

describe('resolvePhaseForDay — basic resolution', () => {
  const phases = makePhases([28, 35, 27]); // 90-day plan

  it('resolves day 1 to phase 1', () => {
    const { phase, week, dayInPhase } = resolvePhaseForDay(phases, 1);
    expect(phase.phaseNumber).toBe(1);
    expect(dayInPhase).toBe(1);
    expect(week).toBe(1);
  });

  it('resolves the last day of phase 1 (day 28) correctly', () => {
    const { phase, dayInPhase } = resolvePhaseForDay(phases, 28);
    expect(phase.phaseNumber).toBe(1);
    expect(dayInPhase).toBe(28);
  });

  it('resolves the first day of phase 2 (day 29) correctly', () => {
    const { phase, dayInPhase } = resolvePhaseForDay(phases, 29);
    expect(phase.phaseNumber).toBe(2);
    expect(dayInPhase).toBe(1);
  });

  it('resolves mid-phase 2 correctly', () => {
    const { phase, week, dayInPhase } = resolvePhaseForDay(phases, 42);
    expect(phase.phaseNumber).toBe(2);
    expect(dayInPhase).toBe(14); // day 42 - 28 = 14
    expect(week).toBe(2);        // ceil(14/7) = 2
  });

  it('resolves the final day (day 90) to phase 3', () => {
    const { phase } = resolvePhaseForDay(phases, 90);
    expect(phase.phaseNumber).toBe(3);
  });

  it('resolves the first day of phase 3 (day 64) correctly', () => {
    const { phase, dayInPhase } = resolvePhaseForDay(phases, 64);
    expect(phase.phaseNumber).toBe(3);
    expect(dayInPhase).toBe(1);
  });
});

describe('resolvePhaseForDay — week calculation', () => {
  const phases = makePhases([28, 35, 27]);

  it('returns week 1 for days 1-7', () => {
    for (let d = 1; d <= 7; d++) {
      const { week } = resolvePhaseForDay(phases, d);
      expect(week).toBe(1);
    }
  });

  it('returns week 2 for days 8-14', () => {
    for (let d = 8; d <= 14; d++) {
      const { week } = resolvePhaseForDay(phases, d);
      expect(week).toBe(2);
    }
  });

  it('returns week 4 for day 28 (last day of phase 1)', () => {
    const { week } = resolvePhaseForDay(phases, 28);
    expect(week).toBe(4); // ceil(28/7) = 4
  });

  it('resets week counter at phase boundary', () => {
    const { week: wEnd }   = resolvePhaseForDay(phases, 28); // last day phase 1
    const { week: wStart } = resolvePhaseForDay(phases, 29); // first day phase 2
    expect(wEnd).toBe(4);
    expect(wStart).toBe(1);
  });
});

describe('resolvePhaseForDay — overflow handling', () => {
  const phases = makePhases([30, 60]);

  it('falls through to last phase when day exceeds total duration', () => {
    const { phase } = resolvePhaseForDay(phases, 95); // beyond 90
    expect(phase.phaseNumber).toBe(2);
  });
});

describe('resolvePhaseForDay — single phase plan', () => {
  const phases = makePhases([90]);

  it('always resolves to phase 1 for a single-phase plan', () => {
    [1, 30, 60, 90].forEach(day => {
      const { phase } = resolvePhaseForDay(phases, day);
      expect(phase.phaseNumber).toBe(1);
    });
  });
});
