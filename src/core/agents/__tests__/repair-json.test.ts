/**
 * Unit tests for repairJSON — LLM output sanitization
 *
 * repairJSON is a pure transformation function used by every agent's
 * parseAgentJSON() call to handle malformed JSON responses from the model.
 *
 * Run: npm test
 */

import { describe, it, expect } from 'vitest';
import { repairJSON, parseAgentJSON } from '@core/agents/llm-output';

// ─── Markdown fence stripping ──────────────────────────────────────────────

describe('repairJSON — markdown fence stripping', () => {
  it('strips ```json ... ``` fences', () => {
    const input = '```json\n{"key": "value"}\n```';
    const result = JSON.parse(repairJSON(input));
    expect(result.key).toBe('value');
  });

  it('strips plain ``` ... ``` fences (no language tag)', () => {
    const input = '```\n{"key": "value"}\n```';
    const result = JSON.parse(repairJSON(input));
    expect(result.key).toBe('value');
  });

  it('handles whitespace between fence and JSON', () => {
    const input = '```json   \n  {"key": "value"}  \n```';
    const result = JSON.parse(repairJSON(input));
    expect(result.key).toBe('value');
  });

  it('passes through clean JSON unchanged', () => {
    const input = '{"key": "value"}';
    const result = JSON.parse(repairJSON(input));
    expect(result.key).toBe('value');
  });
});

// ─── Outermost brace extraction ───────────────────────────────────────────────

describe('repairJSON — leading/trailing text removal', () => {
  it('strips text before the opening brace', () => {
    const input = 'Here is your JSON: {"key": "value"}';
    const result = JSON.parse(repairJSON(input));
    expect(result.key).toBe('value');
  });

  it('strips text after the closing brace', () => {
    const input = '{"key": "value"} — that\'s the JSON you requested.';
    const result = JSON.parse(repairJSON(input));
    expect(result.key).toBe('value');
  });

  it('extracts the outermost object when there are multiple objects inline', () => {
    const input = 'preamble {"outer": {"inner": 1}} trailing text';
    const result = JSON.parse(repairJSON(input));
    expect(result.outer.inner).toBe(1);
  });
});

// ─── Trailing comma removal ────────────────────────────────────────────────────

describe('repairJSON — trailing comma removal', () => {
  it('removes trailing comma before closing brace', () => {
    const input = '{"key": "value",}';
    const result = JSON.parse(repairJSON(input));
    expect(result.key).toBe('value');
  });

  it('removes trailing comma before closing bracket', () => {
    const input = '{"items": ["a", "b",]}';
    const result = JSON.parse(repairJSON(input));
    expect(result.items).toEqual(['a', 'b']);
  });

  it('removes trailing commas from nested objects', () => {
    const input = '{"outer": {"inner": "val",},}';
    const result = JSON.parse(repairJSON(input));
    expect(result.outer.inner).toBe('val');
  });

  it('handles multiple trailing commas in same object', () => {
    const input = '{"a": 1, "b": 2,}';
    const result = JSON.parse(repairJSON(input));
    expect(result.a).toBe(1);
    expect(result.b).toBe(2);
  });
});

// ─── Smart quote replacement ──────────────────────────────────────────────────

describe('repairJSON — smart quote replacement', () => {
  it('replaces smart double quotes with straight double quotes', () => {
    // \u201C and \u201D are the left/right double quotation marks
    const input = '{\u201Ckey\u201D: \u201Cvalue\u201D}';
    const result = JSON.parse(repairJSON(input));
    expect(result.key).toBe('value');
  });

  it('replaces smart single quotes within string values', () => {
    // \u2018 and \u2019 are left/right single quotation marks
    const input = '{"key": "it\u2019s a value"}';
    const result = JSON.parse(repairJSON(input));
    expect(result.key).toBe("it's a value");
  });
});

// ─── Combined repairs ─────────────────────────────────────────────────────────

describe('repairJSON — combined repairs', () => {
  it('handles fence + trailing commas + smart quotes together', () => {
    const input =
      '```json\n' +
      '{\u201Ctitle\u201D: \u201CHello World\u201D, \u201Citems\u201D: [\u201Ca\u201D, \u201Cb\u201D,],}\n' +
      '```';
    const result = JSON.parse(repairJSON(input));
    expect(result.title).toBe('Hello World');
    expect(result.items).toEqual(['a', 'b']);
  });

  it('handles preamble + fence + trailing comma', () => {
    const input = 'Sure! Here is the JSON:\n```json\n{"x": 42,}\n```';
    const result = JSON.parse(repairJSON(input));
    expect(result.x).toBe(42);
  });

  it('produces parseable output for typical Agent 4 malformed response', () => {
    // Simulates a real LLM response with mixed issues
    const input = `
Here is the task for today:
\`\`\`json
{
  "title": "Practice Session",
  "estimatedMinutes": 30,
  "steps": [
    { "stepNumber": 1, "instruction": "Open your materials.", "duration": "2 min", },
    { "stepNumber": 2, "instruction": "Do the exercise.", "duration": "25 min", },
  ],
}
\`\`\`
Let me know if you need anything else!`;

    const result = JSON.parse(repairJSON(input));
    expect(result.title).toBe('Practice Session');
    expect(result.estimatedMinutes).toBe(30);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].stepNumber).toBe(1);
  });
});

// ─── Edge cases ────────────────────────────────────────────────────────────────

describe('repairJSON — edge cases', () => {
  it('returns empty-ish string when no JSON object found (no braces)', () => {
    const input = 'No JSON here at all.';
    // repairJSON returns the cleaned string; JSON.parse would throw
    // but repairJSON itself should not throw
    expect(() => repairJSON(input)).not.toThrow();
  });

  it('handles empty string without throwing', () => {
    expect(() => repairJSON('')).not.toThrow();
  });

  it('handles already-valid complex nested JSON', () => {
    const valid = JSON.stringify({
      a: [1, 2, 3],
      b: { c: 'd', e: [{ f: true }] },
    });
    const result = JSON.parse(repairJSON(valid));
    expect(result.a).toEqual([1, 2, 3]);
    expect(result.b.e[0].f).toBe(true);
  });
});

// ─── parseAgentJSON — Agent 5 Claude-strategic path ────────────────────────────
// Agent 5's Claude-strategic branch (USE_CLAUDE_FOR_RECALIBRATION) has no Groq
// response_format:json_object guarantee, so a markdown-fenced reply is realistic.

describe('parseAgentJSON — Claude-style fenced responses', () => {
  it('repairs and parses a markdown-fenced Claude response', () => {
    const claudeStyle = 'Here is the recalibrated week:\n```json\n{"status": "MAINTAIN", "days": [1, 2, 3],}\n```';
    const result = parseAgentJSON<{ status: string; days: number[] }>(claudeStyle, 'agent5-weekly-claude');
    expect(result.status).toBe('MAINTAIN');
    expect(result.days).toEqual([1, 2, 3]);
  });

  it('throws a labeled error identifying the failing agent on unrecoverable input', () => {
    expect(() => parseAgentJSON('not json at all', 'agent5-weekly-claude'))
      .toThrow(/\[agent:agent5-weekly-claude\] invalid JSON/);
  });
});
