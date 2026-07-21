/**
 * Smart Groq Client with Auto-Fallback and Retry Logic
 *
 * Features:
 * - Automatic fallback from 70b to 8b on rate limits
 * - Exponential backoff retry logic
 * - Self-healing during development
 */

import Groq from 'groq-sdk';
import { env } from '@config/env';
import { proxyFetch } from './ai-proxy-fetch';

if (!env.GROQ_ENABLED) {
  console.warn('⚠️  Groq is disabled (VITE_GROQ_ENABLED=false). Groq AI features will not work until enabled.');
}

// Requests go to the ai-proxy edge function, which injects the real Groq key
// server-side. `apiKey` here is a dummy — proxyFetch attaches the user's JWT.
const groq = new Groq({
  apiKey: 'proxy',
  baseURL: `${env.AI_PROXY_URL}/groq/openai/v1`,
  fetch: proxyFetch,
  dangerouslyAllowBrowser: true,
  maxRetries: 0, // Disable SDK-level retries — our callWithRetry handles this
});

// ── Session-level telemetry ───────────────────────────────────────────────────
// Lightweight in-memory stats (resets on page reload / script restart).
// Read with getGroqSessionStats(); reset between test runs with resetGroqSessionStats().

interface GroqSessionStats {
  totalCalls: number;
  rateLimitHits: number;
  fallbackCount: number;              // times we fell back from the preferred tier
  modelUsage: Record<string, number>; // model-id → successful call count
}

const _stats: GroqSessionStats = {
  totalCalls: 0,
  rateLimitHits: 0,
  fallbackCount: 0,
  modelUsage: {},
};

export function getGroqSessionStats(): Readonly<GroqSessionStats> {
  return { ..._stats, modelUsage: { ..._stats.modelUsage } };
}

export function resetGroqSessionStats(): void {
  _stats.totalCalls = 0;
  _stats.rateLimitHits = 0;
  _stats.fallbackCount = 0;
  _stats.modelUsage = {};
}

// Model tiers (ordered by capability and cost)
// Note: llama-3.1-70b-versatile has been decommissioned
const MODEL_TIERS = {
  premium:  'llama-3.3-70b-versatile',   // Most capable — curriculum builder, stone profiler
  standard: 'llama-3.1-8b-instant',      // Fast fallback — kicks in when 70b is rate-limited
  economy:  'llama-3.1-8b-instant',      // High-volume cheap calls — task generator, shadow extractor
} as const;

// Default token caps per tier — prevents burning the full context window on every call.
// Agents that genuinely need more can pass max_tokens explicitly.
const DEFAULT_MAX_TOKENS: Record<keyof typeof MODEL_TIERS, number> = {
  premium:  4096,   // Curriculum / roadmap JSON — needs space for structured output
  standard: 2048,   // Fallback path — keep it lean
  economy:  1024,   // Task gen / shadow extractor — JSON fits easily
};

type ModelTier = keyof typeof MODEL_TIERS;

interface GroqError {
  status?: number;
  error?: { message?: string };
  message?: string;
}

interface GroqCallParams {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
}

type GroqCompletion = Groq.Chat.ChatCompletion;

/**
 * Call Groq with automatic fallback and retry logic
 */
export async function callGroqWithFallback(
  params: GroqCallParams,
  preferredTier: ModelTier = 'premium',
  retries = 3
): Promise<GroqCompletion> {
  const modelTiers: ModelTier[] = ['premium', 'standard', 'economy'];
  const startIndex = modelTiers.indexOf(preferredTier);
  const tiersToTry = modelTiers.slice(startIndex);

  let lastError: unknown;

  for (const tier of tiersToTry) {
    const model = MODEL_TIERS[tier];

    try {

      const result = await callWithRetry(
        { ...params, model, max_tokens: params.max_tokens ?? DEFAULT_MAX_TOKENS[tier] },
        retries
      );

      // Record successful call in telemetry
      _stats.totalCalls += 1;
      _stats.modelUsage[model] = (_stats.modelUsage[model] ?? 0) + 1;
      if (tier !== preferredTier) {
        _stats.fallbackCount += 1;
      }

      return result;

    } catch (error: unknown) {
      lastError = error;

      // If not a rate limit error, don't try fallback
      const groqError = error as GroqError;
      if (groqError.status !== 429) {
        throw error;
      }

      _stats.rateLimitHits += 1;
      console.warn(`⚠️ ${tier} model rate limited (session hits: ${_stats.rateLimitHits}), trying next tier...`);
    }
  }

  // All tiers failed
  console.error('❌ All model tiers exhausted');
  throw lastError;
}

/** Milliseconds before a single model call is considered hung */
const CALL_TIMEOUT_MS = 30_000;

/**
 * Retry logic with 30-second timeout per attempt and rate-limit backoff.
 * Timeout → retry up to `retries` times, then throw a user-visible error.
 */
async function callWithRetry(
  params: GroqCallParams & { model: string },
  retries: number
): Promise<GroqCompletion> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(Object.assign(
        new Error(`AI model timed out after ${CALL_TIMEOUT_MS / 1000}s`),
        { code: 'GROQ_TIMEOUT' }
      )),
      CALL_TIMEOUT_MS
    );
  });

  try {
    const result = await Promise.race([
      groq.chat.completions.create(params),
      timeoutPromise,
    ]);
    clearTimeout(timeoutId);
    return result;
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    const groqError = error as GroqError & { code?: string };

    // Timeout: retry once, then bubble a friendly error
    if (groqError.code === 'GROQ_TIMEOUT') {
      if (retries > 0) {
        console.warn(`⏱ ${params.model} timed out after ${CALL_TIMEOUT_MS / 1000}s — retrying (${retries} left)…`);
        return callWithRetry(params, retries - 1);
      }
      throw new Error('The AI took too long to respond. Please check your connection and try again.');
    }

    // Rate-limit: wait the suggested backoff then retry
    if (groqError.status === 429 && retries > 0) {
      // Extract wait time from error message (e.g., "Please try again in 6.85s")
      // Groq SDK wraps the message in both error.error.message and error.message
      const rawMsg = groqError.error?.message ?? groqError.message ?? '';
      const waitMatch = rawMsg.match(/(\d+\.?\d*)s/);
      // Use the suggested wait time, with a minimum of 8s and a +2s safety buffer
      const waitSeconds = Math.max(waitMatch ? parseFloat(waitMatch[1]) : 8, 8) + 2;

      console.warn(`⏳ Rate limited. Retrying in ${waitSeconds}s... (${retries} retries left)`);

      await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
      return callWithRetry(params, retries - 1);
    }

    throw error;
  }
}

/**
 * Convenience function for economy mode (always use 8b)
 */
export async function callGroqEconomy(params: Omit<GroqCallParams, 'model'>) {
  return callGroqWithFallback(params as GroqCallParams, 'economy', 2);
}

// ── Tool calling ──────────────────────────────────────────────────────────────

export interface GroqTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}

export interface GroqToolCallParams extends Omit<GroqCallParams, 'response_format'> {
  tools: GroqTool[];
  tool_name: string; // forces tool_choice to this specific function
}

/**
 * Call Groq with native function calling.
 * Returns the raw `arguments` string from the first tool call.
 * Caller is responsible for JSON.parse().
 */
export async function callGroqWithTools(
  params: GroqToolCallParams,
  preferredTier: ModelTier = 'premium',
  retries = 3
): Promise<string> {
  const modelTiers: ModelTier[] = ['premium', 'standard', 'economy'];
  const startIndex = modelTiers.indexOf(preferredTier);
  const tiersToTry = modelTiers.slice(startIndex);

  let lastError: unknown;

  for (const tier of tiersToTry) {
    const model = MODEL_TIERS[tier];
    try {
      const result = await callWithToolsRetry(
        { ...params, model, max_tokens: params.max_tokens ?? DEFAULT_MAX_TOKENS[tier] },
        retries
      );
      _stats.totalCalls += 1;
      _stats.modelUsage[model] = (_stats.modelUsage[model] ?? 0) + 1;
      if (tier !== preferredTier) _stats.fallbackCount += 1;
      return result;
    } catch (error: unknown) {
      lastError = error;
      const groqError = error as GroqError;
      if (groqError.status !== 429) throw error;
      _stats.rateLimitHits += 1;
      console.warn(`⚠️ ${tier} model rate limited (tool call), trying next tier...`);
    }
  }

  throw lastError;
}

async function callWithToolsRetry(
  params: GroqToolCallParams & { model: string },
  retries: number
): Promise<string> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(Object.assign(
        new Error(`AI model timed out after ${CALL_TIMEOUT_MS / 1000}s`),
        { code: 'GROQ_TIMEOUT' }
      )),
      CALL_TIMEOUT_MS
    );
  });

  try {
    const result = await Promise.race([
      groq.chat.completions.create({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        tools: params.tools,
        tool_choice: { type: 'function', function: { name: params.tool_name } },
      }),
      timeoutPromise,
    ]);
    clearTimeout(timeoutId);

    const args = (result as Groq.Chat.ChatCompletion).choices[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error('Tool arguments truncated — increase max_tokens');
    return args;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const groqError = error as GroqError & { code?: string };

    if (groqError.code === 'GROQ_TIMEOUT') {
      if (retries > 0) {
        console.warn(`⏱ Tool call timed out — retrying (${retries} left)…`);
        return callWithToolsRetry(params, retries - 1);
      }
      throw new Error('The AI took too long to respond. Please check your connection and try again.');
    }

    if (groqError.status === 429 && retries > 0) {
      const rawMsg = groqError.error?.message ?? groqError.message ?? '';
      const waitMatch = rawMsg.match(/(\d+\.?\d*)s/);
      const waitSeconds = Math.max(waitMatch ? parseFloat(waitMatch[1]) : 8, 8) + 2;
      console.warn(`⏳ Rate limited (tool call). Retrying in ${waitSeconds}s... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
      return callWithToolsRetry(params, retries - 1);
    }

    throw error;
  }
}

// ── Streaming ─────────────────────────────────────────────────────────────────

export interface GroqStreamParams {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  // Note: response_format is incompatible with stream: true — omit it
}

/**
 * Stream tokens from Groq. Each yielded string is a content delta.
 * Fails fast — no retry logic. Caller should suppress errors silently for UX-only streams.
 */
export async function* streamGroq(
  params: GroqStreamParams,
  tier: ModelTier = 'standard'
): AsyncGenerator<string, void, unknown> {
  const model = params.model ?? MODEL_TIERS[tier];
  const stream = await groq.chat.completions.create({
    model,
    messages: params.messages,
    temperature: params.temperature,
    max_tokens: params.max_tokens,
    stream: true,
  });
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content ?? '';
    if (token) yield token;
  }
}

/**
 * Direct access to Groq client (for non-critical calls)
 */
export { groq };
