/**
 * OpenRouter Client
 *
 * Native fetch-based client for OpenRouter API.
 * No SDK dependency — just the fetch API.
 *
 * Model routing per agent role:
 *   fast     → google/gemini-flash-1.5              Shadow Extractor, cheap JSON extraction
 *   haiku    → anthropic/claude-3-5-haiku-20241022  Goal Analyzer, Stone ID, Task Gen, Recalibrator
 *   sonnet   → anthropic/claude-3-5-sonnet-20241022 Curriculum Builder (long, coherent multi-phase plans)
 *
 * Parallelism note:
 *   Agents 1 and 2 (onboarding) are currently sequential because Agent 2 uses Agent 1 output.
 *   Future: refactor Stone Identifier to accept raw context so both can run in Promise.all().
 */

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';

export const OR_MODELS = {
  /** Ultra-fast, cheap — Shadow Extractor + task generation volume */
  fast:   'google/gemini-1.5-flash',
  /** Capable haiku-class — Goal Analyzer, Stone Identifier, Task Gen, Recalibrator */
  haiku:  'anthropic/claude-3-5-haiku',
  /** Sonnet-class — Curriculum Builder (complex long structured output) */
  sonnet: 'anthropic/claude-3-5-sonnet',
} as const;

export type ORModel = typeof OR_MODELS[keyof typeof OR_MODELS];

export interface ORMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ORCallParams {
  model: ORModel;
  messages: ORMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
}

// ── Session telemetry ─────────────────────────────────────────────────────────

interface ORStats {
  totalCalls: number;
  modelUsage: Record<string, number>;
  errors: number;
  retries: number;
}

const _stats: ORStats = { totalCalls: 0, modelUsage: {}, errors: 0, retries: 0 };

export function getORStats(): Readonly<ORStats> {
  return { ..._stats, modelUsage: { ..._stats.modelUsage } };
}

export function resetORStats(): void {
  _stats.totalCalls = 0;
  _stats.modelUsage = {};
  _stats.errors = 0;
  _stats.retries = 0;
}

// ── Core fetch ────────────────────────────────────────────────────────────────

function getKey(): string {
  const key = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!key) throw new Error('[OpenRouter] VITE_OPENROUTER_API_KEY is not set in .env');
  return key;
}

function extractWaitMs(errMsg: string): number {
  const m = errMsg.match(/(\d+\.?\d*)\s*s/);
  return m ? Math.max(parseFloat(m[1]) * 1000 + 2000, 6000) : 8000;
}

async function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export async function callOR(params: ORCallParams, attempt = 0): Promise<string> {
  const MAX_RETRIES = 3;

  let res: Response;
  try {
    res = await fetch(OPENROUTER_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getKey()}`,
        'HTTP-Referer': 'https://coheren.ai',
        'X-Title': 'Coheren AI Coach',
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature ?? 0.3,
        max_tokens: params.max_tokens ?? 4096,
        ...(params.response_format ? { response_format: params.response_format } : {}),
      }),
    });
  } catch (networkErr) {
    if (attempt < MAX_RETRIES) {
      _stats.retries++;
      await delay(1500 * (attempt + 1));
      return callOR(params, attempt + 1);
    }
    _stats.errors++;
    throw networkErr;
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
    const errMsg = errBody?.error?.message ?? `HTTP ${res.status}`;

    if (res.status === 429 && attempt < MAX_RETRIES) {
      _stats.retries++;
      const waitMs = extractWaitMs(errMsg);
      console.warn(`[OpenRouter] Rate limited on ${params.model}. Retrying in ${waitMs / 1000}s…`);
      await delay(waitMs);
      return callOR(params, attempt + 1);
    }

    if ((res.status === 502 || res.status === 503) && attempt < MAX_RETRIES) {
      _stats.retries++;
      await delay(3000);
      return callOR(params, attempt + 1);
    }

    _stats.errors++;
    throw new Error(`[OpenRouter] ${params.model} failed: ${errMsg}`);
  }

  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const content = data?.choices?.[0]?.message?.content ?? '';

  _stats.totalCalls++;
  _stats.modelUsage[params.model] = (_stats.modelUsage[params.model] ?? 0) + 1;

  console.log(`✅ [OpenRouter] ${params.model} (call #${_stats.totalCalls})`);
  return content;
}

// ── Convenience wrappers ──────────────────────────────────────────────────────

/** Gemini Flash — Shadow Extractor, bulk JSON tasks. Fastest + cheapest. */
export async function callORFast(
  messages: ORMessage[],
  opts?: Partial<Omit<ORCallParams, 'model' | 'messages'>>
): Promise<string> {
  return callOR({ model: OR_MODELS.fast, messages, temperature: 0.1, ...opts });
}

/** Claude Haiku — Goal Analyzer, Stone Identifier, Task Gen, Recalibrator. */
export async function callORHaiku(
  messages: ORMessage[],
  opts?: Partial<Omit<ORCallParams, 'model' | 'messages'>>
): Promise<string> {
  return callOR({ model: OR_MODELS.haiku, messages, temperature: 0.3, ...opts });
}

/** Claude Sonnet — Curriculum Builder only (complex multi-phase roadmaps). */
export async function callORSonnet(
  messages: ORMessage[],
  opts?: Partial<Omit<ORCallParams, 'model' | 'messages'>>
): Promise<string> {
  return callOR({ model: OR_MODELS.sonnet, messages, temperature: 0.3, max_tokens: 8192, ...opts });
}
