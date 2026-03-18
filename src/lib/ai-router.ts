/**
 * Multi-Provider AI Router — Groq edition
 *
 * All agents call one of three public functions:
 *   callEconomy()   → Groq llama-3.1-8b-instant    Shadow Extractor, Task Generator (fast + cheap JSON)
 *   callReasoning() → Groq llama-3.3-70b-versatile  Goal Analyzer, Stone Identifier, Recalibrator
 *   callPremium()   → Groq llama-3.3-70b-versatile  Curriculum Builder (same model, max quality)
 *
 * Adding a new provider: add a ProviderAdapter and push into the relevant chain.
 * Switching primary: reorder chain arrays — no agent changes needed.
 */

import {
  callGroqWithFallback,
  callGroqEconomy,
  getGroqSessionStats,
  resetGroqSessionStats,
} from './groq-client';

// ── Shared types (agents depend on these) ─────────────────────────────────────

export type AgentTier = 'reasoning' | 'economy' | 'premium';

export interface RouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface RouterCallParams {
  messages: RouterMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
}

export interface RouterCompletion {
  content: string;
  provider: string;
  model: string;
}

// ── Provider adapter interface ────────────────────────────────────────────────

interface ProviderAdapter {
  name: string;
  model: string;
  isAvailable: () => boolean;
  call: (params: RouterCallParams) => Promise<RouterCompletion>;
}

// ── Groq adapters ─────────────────────────────────────────────────────────────

const groqFast: ProviderAdapter = {
  name: 'groq', model: 'llama-3.1-8b-instant',
  isAvailable: () => Boolean(import.meta.env.VITE_GROQ_API_KEY),
  async call(params) {
    const completion = await callGroqEconomy({
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
      response_format: params.response_format,
    });
    const content = completion.choices[0]?.message?.content ?? '';
    return { content, provider: 'groq', model: 'llama-3.1-8b-instant' };
  },
};

const groqStandard: ProviderAdapter = {
  name: 'groq', model: 'llama-3.3-70b-versatile',
  isAvailable: () => Boolean(import.meta.env.VITE_GROQ_API_KEY),
  async call(params) {
    const completion = await callGroqWithFallback({
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
      response_format: params.response_format,
    }, 'premium');
    const content = completion.choices[0]?.message?.content ?? '';
    return { content, provider: 'groq', model: 'llama-3.3-70b-versatile' };
  },
};

// ── Provider chains ───────────────────────────────────────────────────────────

const ECONOMY_CHAIN:   ProviderAdapter[] = [groqFast];     // llama-3.1-8b-instant
const REASONING_CHAIN: ProviderAdapter[] = [groqStandard]; // llama-3.3-70b-versatile
const PREMIUM_CHAIN:   ProviderAdapter[] = [groqStandard]; // llama-3.3-70b-versatile

// ── Core router ───────────────────────────────────────────────────────────────

async function routeCall(
  params: RouterCallParams,
  chain: ProviderAdapter[],
  tierLabel: string,
): Promise<RouterCompletion> {
  const available = chain.filter(p => p.isAvailable());

  if (available.length === 0) {
    throw new Error(
      `[AI Router] No providers available for ${tierLabel} tier. ` +
      'Set VITE_GROQ_API_KEY in .env.',
    );
  }

  let lastError: unknown;

  for (let i = 0; i < available.length; i++) {
    const provider = available[i];
    try {
      const result = await provider.call(params);
      return result;
    } catch (error) {
      lastError = error;
      const e = error as { status?: number; message?: string };
      const isNetworkError =
        e.status === undefined &&
        (e.message?.includes('ERR_CONNECTION') ||
          e.message?.includes('Failed to fetch') ||
          e.message?.includes('NetworkError'));
      if (e.status !== 429 && e.status !== 503 && !isNetworkError) throw error;
      console.warn(`[AI Router] ${provider.model} unavailable (${e.status ?? 'network'}), trying next…`);
    }
  }

  throw lastError;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Economy — Groq llama-3.1-8b-instant.
 * Shadow Extractor, Task Generator. High-volume cheap JSON calls.
 */
export async function callEconomy(params: RouterCallParams): Promise<RouterCompletion> {
  return routeCall(params, ECONOMY_CHAIN, 'economy');
}

/**
 * Reasoning — Groq llama-3.3-70b-versatile.
 * Goal Analyzer (Agent 1), Stone Identifier (Agent 2), Recalibrator (Agent 5), Chat.
 */
export async function callReasoning(params: RouterCallParams): Promise<RouterCompletion> {
  return routeCall(params, REASONING_CHAIN, 'reasoning');
}

/**
 * Premium — Groq llama-3.3-70b-versatile.
 * Curriculum Builder (Agent 3) only. Complex long structured output.
 */
export async function callPremium(params: RouterCallParams): Promise<RouterCompletion> {
  return routeCall(params, PREMIUM_CHAIN, 'premium');
}

// ── Telemetry ─────────────────────────────────────────────────────────────────

export { getGroqSessionStats as getSessionStats, resetGroqSessionStats as resetSessionStats };
// Legacy aliases — keeps any existing imports from breaking
export { getGroqSessionStats as getGroqSessionStats_, resetGroqSessionStats as resetGroqSessionStats_ };
