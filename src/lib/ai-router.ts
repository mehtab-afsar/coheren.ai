/**
 * Multi-Provider AI Router
 *
 * Abstracts Groq / Anthropic / OpenAI behind a single call interface.
 * Agents call callReasoning() or callEconomy() — the router picks the best
 * available provider automatically.
 *
 * Tier mapping:
 *   reasoning — Agents 1, 2, 3, 5  (complex, low-volume)
 *   economy   — Agent 4             (simple, high-volume)
 *
 * Provider priority order (first available wins):
 *   reasoning: Groq 70b  [→ add anthropicReasoning here when ready]
 *   economy:   Groq 8b   [→ add anthropicEconomy here when ready]
 *
 * Adding Anthropic:
 *   1. npm install @anthropic-ai/sdk
 *   2. Add VITE_ANTHROPIC_API_KEY to .env
 *   3. Import and add the anthropicReasoning / anthropicEconomy adapters
 *      from src/lib/ai-router-anthropic.ts (create when needed — see ARCHITECTURE.md)
 *   4. Push them into REASONING_CHAIN / ECONOMY_CHAIN below
 *
 * Adding a new provider: implement ProviderAdapter and push to the chain arrays.
 * Switching primary:     reorder the arrays — no agent changes needed.
 */

import { callGroqWithFallback } from './groq-client';
export { getGroqSessionStats, resetGroqSessionStats } from './groq-client';

// ── Shared types ──────────────────────────────────────────────────────────────

export type AgentTier = 'reasoning' | 'economy';

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

/** Provider-agnostic completion returned to all agents */
export interface RouterCompletion {
  content: string;
  provider: string;
  model: string;
}

// ── Provider adapter interface ────────────────────────────────────────────────

interface ProviderAdapter {
  name: string;
  model: string;
  /** True when the API key env var is present */
  isAvailable: () => boolean;
  call: (params: RouterCallParams) => Promise<RouterCompletion>;
}

// ── Groq adapters ─────────────────────────────────────────────────────────────

const groqReasoning: ProviderAdapter = {
  name:  'groq',
  model: 'llama-3.3-70b-versatile',
  isAvailable: () => Boolean(import.meta.env.VITE_GROQ_API_KEY),
  async call(params) {
    const completion = await callGroqWithFallback(params, 'standard', 3);
    const content = completion.choices[0]?.message?.content ?? '';
    return { content, provider: 'groq', model: completion.model };
  },
};

const groqEconomy: ProviderAdapter = {
  name:  'groq',
  model: 'llama-3.1-8b-instant',
  isAvailable: () => Boolean(import.meta.env.VITE_GROQ_API_KEY),
  async call(params) {
    const completion = await callGroqWithFallback(params, 'economy', 2);
    const content = completion.choices[0]?.message?.content ?? '';
    return { content, provider: 'groq', model: completion.model };
  },
};

// ── Provider chains ───────────────────────────────────────────────────────────
// Reorder these arrays to change provider priority without touching agents.
// To add Anthropic: push anthropicReasoning / anthropicEconomy after installing the SDK.

const REASONING_CHAIN: ProviderAdapter[] = [
  groqReasoning, // Primary: Groq 70b (free tier)
  // anthropicReasoning — add when VITE_ANTHROPIC_API_KEY + @anthropic-ai/sdk are ready
];

const ECONOMY_CHAIN: ProviderAdapter[] = [
  groqEconomy, // Primary: Groq 8b (free tier, high rate-limit)
  // anthropicEconomy — add when VITE_ANTHROPIC_API_KEY + @anthropic-ai/sdk are ready
];

// ── Core router ───────────────────────────────────────────────────────────────

async function routeCall(
  params: RouterCallParams,
  chain: ProviderAdapter[],
  tierLabel: string,
): Promise<RouterCompletion> {
  const available = chain.filter(p => p.isAvailable());

  if (available.length === 0) {
    throw new Error(
      `[AI Router] No providers configured for ${tierLabel} tier. ` +
      'Set VITE_GROQ_API_KEY in .env.',
    );
  }

  let lastError: unknown;

  for (let i = 0; i < available.length; i++) {
    const provider = available[i];
    try {
      const result = await provider.call(params);
      if (i > 0) {
        console.log(`[AI Router] ${tierLabel}: fell back to ${provider.name}/${provider.model}`);
      }
      return result;
    } catch (error) {
      lastError = error;
      const e = error as { status?: number; message?: string };
      const isNetworkError = e.status === undefined && (
        e.message?.includes('ERR_CONNECTION') ||
        e.message?.includes('Failed to fetch') ||
        e.message?.includes('NetworkError') ||
        e.message?.includes('fetch')
      );
      // Fall back on: rate-limit (429), service unavailable (503), or network drop
      if (e.status !== 429 && e.status !== 503 && !isNetworkError) throw error;
      console.warn(`[AI Router] ${provider.name} ${tierLabel} unreachable (${e.status ?? 'network'}), trying next...`);
    }
  }

  throw lastError;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Call the reasoning tier — use for Agents 1, 2, 3, 5.
 * Targets the most capable available model.
 */
export async function callReasoning(params: RouterCallParams): Promise<RouterCompletion> {
  return routeCall(params, REASONING_CHAIN, 'reasoning');
}

/**
 * Call the economy tier — use for Agent 4 (daily task generation).
 * Targets the fastest / cheapest model to preserve reasoning quota.
 */
export async function callEconomy(params: RouterCallParams): Promise<RouterCompletion> {
  return routeCall(params, ECONOMY_CHAIN, 'economy');
}
