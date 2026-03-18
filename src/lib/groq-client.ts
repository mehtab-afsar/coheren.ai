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

if (!env.GROQ_API_KEY) {
  console.warn('⚠️  VITE_GROQ_API_KEY is not set. Groq AI features will not work until this is configured.');
}

const groq = new Groq({
  apiKey: env.GROQ_API_KEY || 'placeholder-key',
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
  premium: 'llama-3.3-70b-versatile',    // Most capable, highest rate limits hit
  standard: 'llama-3.3-70b-versatile',   // Same as premium (70b-versatile is only 70b option)
  economy: 'llama-3.1-8b-instant',       // Fast, high rate limits, RECOMMENDED for development
} as const;

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
        { ...params, model },
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

/**
 * Direct access to Groq client (for non-critical calls)
 */
export { groq };
