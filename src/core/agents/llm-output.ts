/**
 * Shared LLM-output parsing for all agents.
 *
 * LLMs often wrap JSON in markdown code fences, leave trailing commas, or use
 * smart quotes — especially on paths without Groq's `response_format: json_object`
 * guarantee (e.g. tool-call arguments, Claude strategic calls). Every agent should
 * repair before parsing; this used to be duplicated per-agent and only applied
 * inconsistently. See parseAgentJSON for the standard call-site pattern.
 */

export function repairJSON(raw: string): string {
  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) raw = fenceMatch[1];

  // Find the outermost JSON object boundaries
  const start = raw.indexOf('{');
  const end   = raw.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    raw = raw.substring(start, end + 1);
  }

  // Fix common LLM JSON errors
  raw = raw
    .replace(/,\s*}/g, '}')       // trailing commas before }
    .replace(/,\s*]/g, ']')       // trailing commas before ]
    .replace(/[‘’]/g, "'") // smart single quotes
    .replace(/[“”]/g, '"'); // smart double quotes

  return raw;
}

/**
 * Repair + parse raw LLM output, throwing a consistently-labeled error on failure.
 * `label` should identify the agent/call site (e.g. 'agent1', 'agent5-weekly-claude')
 * so failures are diagnosable in logs.
 */
export function parseAgentJSON<T = unknown>(content: string, label: string): T {
  try {
    return JSON.parse(repairJSON(content)) as T;
  } catch (e) {
    throw new Error(`[agent:${label}] invalid JSON — ${(e as Error).message}\nFirst 200 chars: ${content.slice(0, 200)}`);
  }
}
