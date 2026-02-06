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

// Model tiers (ordered by capability and cost)
// Note: llama-3.1-70b-versatile has been decommissioned
const MODEL_TIERS = {
  premium: 'llama-3.3-70b-versatile',    // Most capable, highest rate limits hit
  standard: 'llama-3.3-70b-versatile',   // Same as premium (70b-versatile is only 70b option)
  economy: 'llama-3.1-8b-instant',       // Fast, high rate limits, RECOMMENDED for development
} as const;

type ModelTier = keyof typeof MODEL_TIERS;

interface GroqCallParams {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
  [key: string]: any; // Allow additional Groq SDK parameters
}

/**
 * Call Groq with automatic fallback and retry logic
 */
export async function callGroqWithFallback(
  params: GroqCallParams,
  preferredTier: ModelTier = 'premium',
  retries = 3
): Promise<any> {
  const modelTiers: ModelTier[] = ['premium', 'standard', 'economy'];
  const startIndex = modelTiers.indexOf(preferredTier);
  const tiersToTry = modelTiers.slice(startIndex);

  let lastError: any;

  for (const tier of tiersToTry) {
    const model = MODEL_TIERS[tier];

    try {
      console.log(`🤖 Attempting API call with ${tier} model (${model})`);

      const result = await callWithRetry(
        { ...params, model },
        retries
      );

      if (tier !== preferredTier) {
        console.log(`✅ Success with fallback model: ${tier}`);
      }

      return result;

    } catch (error: any) {
      lastError = error;

      // If not a rate limit error, don't try fallback
      if (error.status !== 429) {
        throw error;
      }

      console.warn(`⚠️ ${tier} model rate limited, trying next tier...`);
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
  params: GroqCallParams,
  retries: number
): Promise<any> {
  try {
    return await groq.chat.completions.create(params as any);
  } catch (error: any) {
    if (error.status === 429 && retries > 0) {
      // Extract wait time from error message (e.g., "Please try again in 2.5s")
      const waitMatch = error.error?.message?.match(/(\d+\.?\d*)s/);
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
