/**
 * Smart Groq Client with Auto-Fallback and Retry Logic
 *
 * Features:
 * - Automatic fallback from 70b to 8b on rate limits
 * - Exponential backoff retry logic
 * - Self-healing during development
 */

import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
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
      console.log(`🤖 Attempting API call with ${tier} model (${model})`);

      const result = await callWithRetry(
        { ...params, model },
        retries
      );

      // Record successful call in telemetry
      _stats.totalCalls += 1;
      _stats.modelUsage[model] = (_stats.modelUsage[model] ?? 0) + 1;
      if (tier !== preferredTier) {
        _stats.fallbackCount += 1;
        console.log(`✅ Success with fallback model: ${tier} (session fallbacks: ${_stats.fallbackCount})`);
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

/**
 * Retry logic with exponential backoff
 */
async function callWithRetry(
  params: GroqCallParams & { model: string },
  retries: number
): Promise<GroqCompletion> {
  try {
    return await groq.chat.completions.create(params);
  } catch (error: unknown) {
    const groqError = error as GroqError;
    if (groqError.status === 429 && retries > 0) {
      // Extract wait time from error message (e.g., "Please try again in 2.5s")
      const waitMatch = groqError.error?.message?.match(/(\d+\.?\d*)s/);
      const waitSeconds = waitMatch ? parseFloat(waitMatch[1]) : 2;

      console.warn(`⏳ Rate limited. Retrying in ${waitSeconds}s... (${retries} retries left)`);

      await new Promise(resolve => setTimeout(resolve, (waitSeconds + 0.5) * 1000));
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
