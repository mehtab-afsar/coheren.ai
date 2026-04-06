/**
 * Multi-Provider AI Router — Groq + Claude
 *
 * All agents call one of five public functions:
 *   callEconomy()                → Groq llama-3.1-8b-instant    Task Generator (fast + cheap JSON)
 *   callReasoning()              → Groq llama-3.3-70b-versatile  Goal Analyzer, Stone Identifier, Recalibrator
 *   callPremium()                → Groq llama-3.3-70b-versatile  Curriculum Builder (same model, max quality)
 *   callStrategic()              → Claude claude-sonnet-4-6       Agent 3 + 5 when USE_CLAUDE_FOR_* flags on
 *   callStrategicWithThinking()  → Claude extended thinking        Agent 3 curriculum design
 *
 * Adding a new provider: add a ProviderAdapter and push into the relevant chain.
 * Switching primary: reorder chain arrays — no agent changes needed.
 */

import {
  callGroqWithFallback,
  callGroqEconomy,
  callGroqWithTools,
  streamGroq,
  getGroqSessionStats,
  resetGroqSessionStats,
} from './groq-client';
import type { GroqTool } from './groq-client';
import {
  callClaude,
  callClaudeWithThinking,
  isClaudeAvailable,
  type ClaudeMessage,
  type ClaudeThinkingResult,
  type ClaudeToolCallParams,
  callClaudeWithTools as _callClaudeWithTools,
} from './claude-client';

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

// ── Tool calling ──────────────────────────────────────────────────────────────

export type { GroqTool };

export interface ToolCallParams extends Omit<RouterCallParams, 'response_format'> {
  tools: GroqTool[];
  tool_name: string;
}

/**
 * Call any tier with native function calling.
 * Returns the raw arguments string — caller does JSON.parse().
 */
export async function callWithTools(
  params: ToolCallParams,
  tier: 'economy' | 'reasoning' | 'premium' = 'reasoning'
): Promise<string> {
  const groqTier = tier === 'economy' ? 'economy' : tier === 'premium' ? 'premium' : 'standard';
  return callGroqWithTools(
    {
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
      tools: params.tools,
      tool_name: params.tool_name,
    },
    groqTier as Parameters<typeof callGroqWithTools>[1]
  );
}

// ── Streaming ─────────────────────────────────────────────────────────────────

/**
 * Stream tokens from the reasoning tier (llama-3.3-70b).
 * Use for UX-only parallel calls — fail fast, suppress errors at call site.
 */
export async function* callReasoningStream(
  params: Omit<RouterCallParams, 'response_format'>
): AsyncGenerator<string> {
  yield* streamGroq(
    { messages: params.messages, temperature: params.temperature, max_tokens: params.max_tokens },
    'standard'
  );
}

/**
 * Stream tokens from the economy tier (llama-3.1-8b).
 * Use for cheap preview text during Agent 4 generation.
 */
export async function* callEconomyStream(
  params: Omit<RouterCallParams, 'response_format'>
): AsyncGenerator<string> {
  yield* streamGroq(
    { messages: params.messages, temperature: params.temperature, max_tokens: params.max_tokens },
    'economy'
  );
}

// ── Claude strategic tier ─────────────────────────────────────────────────────

/**
 * Strategic — Claude claude-sonnet-4-6.
 * Agent 3 (Curriculum Builder) and Agent 5 (Recalibrator) when USE_CLAUDE_FOR_* flags are on.
 * Falls back to callPremium() (Groq 70b) when VITE_ANTHROPIC_API_KEY is not set.
 */
export async function callStrategic(params: RouterCallParams): Promise<RouterCompletion> {
  if (!isClaudeAvailable()) return callPremium(params);
  const content = await callClaude({
    messages: params.messages.filter(m => m.role !== 'system').map(m => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content,
    })) as ClaudeMessage[],
    systemPrompt: params.messages.find(m => m.role === 'system')?.content,
    temperature:  params.temperature,
    max_tokens:   params.max_tokens,
  });
  return { content, provider: 'claude', model: 'claude-sonnet-4-6' };
}

/**
 * Strategic with extended thinking — Claude claude-sonnet-4-6 + thinking block.
 * Returns `{ content, thinking }` embedded in content as `[THINKING]…[/THINKING]\n{output}`.
 * Falls back to callStrategic() when VITE_ANTHROPIC_API_KEY is not set.
 */
export async function callStrategicWithThinking(
  params: RouterCallParams & { budgetTokens?: number },
): Promise<RouterCompletion & { thinking?: string }> {
  if (!isClaudeAvailable()) {
    const result = await callPremium(params);
    return result;
  }
  const result: ClaudeThinkingResult = await callClaudeWithThinking({
    messages: params.messages.filter(m => m.role !== 'system').map(m => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content,
    })) as ClaudeMessage[],
    systemPrompt: params.messages.find(m => m.role === 'system')?.content,
    budgetTokens: params.budgetTokens ?? 8000,
    max_tokens:   params.max_tokens ?? 12000,
  });
  return {
    content:  result.output,
    thinking: result.thinking,
    provider: 'claude',
    model:    'claude-sonnet-4-6',
  };
}

/**
 * Re-export callClaudeWithTools so agents can do tool-use loops through the router.
 * Only available when VITE_ANTHROPIC_API_KEY is set; throws otherwise.
 */
export async function callStrategicWithTools(
  params: ClaudeToolCallParams,
) {
  if (!isClaudeAvailable()) {
    throw new Error('[AI Router] callStrategicWithTools requires VITE_ANTHROPIC_API_KEY');
  }
  return _callClaudeWithTools(params);
}

// ── Telemetry ─────────────────────────────────────────────────────────────────

export { getGroqSessionStats as getSessionStats, resetGroqSessionStats as resetSessionStats };
// Legacy aliases — keeps any existing imports from breaking
export { getGroqSessionStats as getGroqSessionStats_, resetGroqSessionStats as resetGroqSessionStats_ };
