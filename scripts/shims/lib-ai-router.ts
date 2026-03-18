/**
 * Node.js shim for src/lib/ai-router.ts
 * Replaces import.meta.env.VITE_GROQ_API_KEY with process.env equivalent
 * All exported types and functions are preserved.
 */

import {
  callGroqWithFallback,
  callGroqEconomy,
  getGroqSessionStats,
  resetGroqSessionStats,
} from '../../src/lib/groq-client.ts';

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

interface ProviderAdapter {
  name: string;
  model: string;
  isAvailable: () => boolean;
  call: (params: RouterCallParams) => Promise<RouterCompletion>;
}

// Use process.env instead of import.meta.env
const groqFast: ProviderAdapter = {
  name: 'groq', model: 'llama-3.1-8b-instant',
  isAvailable: () => Boolean((process.env as Record<string, string | undefined>)['VITE_GROQ_API_KEY']),
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
  isAvailable: () => Boolean((process.env as Record<string, string | undefined>)['VITE_GROQ_API_KEY']),
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

const ECONOMY_CHAIN:   ProviderAdapter[] = [groqFast];
const REASONING_CHAIN: ProviderAdapter[] = [groqStandard];
const PREMIUM_CHAIN:   ProviderAdapter[] = [groqStandard];

async function routeCall(params: RouterCallParams, chain: ProviderAdapter[], tierLabel: string): Promise<RouterCompletion> {
  const available = chain.filter(p => p.isAvailable());
  if (available.length === 0) {
    throw new Error(`[AI Router] No providers available for ${tierLabel} tier. Set VITE_GROQ_API_KEY in .env.`);
  }
  let lastError: unknown;
  for (const provider of available) {
    try {
      return await provider.call(params);
    } catch (error) {
      lastError = error;
      const e = error as { status?: number; message?: string };
      if (e.status !== 429 && e.status !== 503) throw error;
      console.warn(`[AI Router] ${provider.model} unavailable (${e.status}), trying next…`);
    }
  }
  throw lastError;
}

export async function callEconomy(params: RouterCallParams): Promise<RouterCompletion> {
  return routeCall(params, ECONOMY_CHAIN, 'economy');
}

export async function callReasoning(params: RouterCallParams): Promise<RouterCompletion> {
  return routeCall(params, REASONING_CHAIN, 'reasoning');
}

export async function callPremium(params: RouterCallParams): Promise<RouterCompletion> {
  return routeCall(params, PREMIUM_CHAIN, 'premium');
}

export { getGroqSessionStats as getSessionStats, resetGroqSessionStats as resetSessionStats };
export { getGroqSessionStats as getGroqSessionStats_, resetGroqSessionStats as resetGroqSessionStats_ };
