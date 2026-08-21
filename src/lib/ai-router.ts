/**
 * AI Router — Claude is the sole provider.
 *
 * All agents call one of these public functions:
 *   callEconomy()                → Claude claude-sonnet-4-6   Task Generator (fast, cheap JSON)
 *   callReasoning()              → Claude claude-sonnet-4-6   Goal Analyzer, Stone Identifier, Recalibrator
 *   callPremium()                → Claude claude-sonnet-4-6   Curriculum Builder
 *   callStrategic()              → Claude claude-sonnet-4-6   Agent 3 + 5 when USE_CLAUDE_FOR_* flags on
 *   callStrategicWithThinking()  → Claude extended thinking   Agent 3 curriculum design
 *   callWithTools()              → Claude forced single tool call (structured-output trick)
 *   callStrategicWithTools()     → Claude multi-turn agentic tool-use loop
 *
 * Adding a new provider: add a ProviderAdapter and push into the relevant chain.
 */

import {
  callClaude,
  callClaudeWithThinking,
  callClaudeWithForcedTool,
  streamClaude,
  isClaudeAvailable,
  type ClaudeMessage,
  type ClaudeThinkingResult,
  type ClaudeToolCallParams,
  type ForcedToolSchema,
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

// ── Claude adapter ────────────────────────────────────────────────────────────
// Same shape callStrategic() already builds inline below — extracted so the base
// tiers (economy/reasoning/premium) can use Claude too, not just the strategic tier.

const claudeAdapter: ProviderAdapter = {
  name: 'claude', model: 'claude-sonnet-4-6',
  isAvailable: () => isClaudeAvailable(),
  async call(params) {
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
  },
};

// ── Provider chains ───────────────────────────────────────────────────────────
// Claude is the only provider in the codebase now — one adapter per chain. Kept
// as an array (not a single value) so a second provider could be added later
// without changing routeCall's shape.

const ECONOMY_CHAIN:   ProviderAdapter[] = [claudeAdapter];
const REASONING_CHAIN: ProviderAdapter[] = [claudeAdapter];
const PREMIUM_CHAIN:   ProviderAdapter[] = [claudeAdapter];

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
      'Set VITE_CLAUDE_ENABLED=true and ensure the ai-proxy edge function is deployed.',
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
 * Economy — Claude claude-sonnet-4-6.
 * Shadow Extractor, Task Generator. High-volume cheap JSON calls.
 */
export async function callEconomy(params: RouterCallParams): Promise<RouterCompletion> {
  return routeCall(params, ECONOMY_CHAIN, 'economy');
}

/**
 * Reasoning — Claude claude-sonnet-4-6.
 * Goal Analyzer (Agent 1), Stone Identifier (Agent 2), Recalibrator (Agent 5), Chat.
 */
export async function callReasoning(params: RouterCallParams): Promise<RouterCompletion> {
  return routeCall(params, REASONING_CHAIN, 'reasoning');
}

/**
 * Premium — Claude claude-sonnet-4-6.
 * Curriculum Builder (Agent 3) only. Complex long structured output.
 */
export async function callPremium(params: RouterCallParams): Promise<RouterCompletion> {
  return routeCall(params, PREMIUM_CHAIN, 'premium');
}

// ── Tool calling ──────────────────────────────────────────────────────────────

export type { ForcedToolSchema as ToolSchema };

export interface ToolCallParams extends Omit<RouterCallParams, 'response_format'> {
  tools: ForcedToolSchema[];
  tool_name: string;
}

/**
 * Forced single tool call (structured-output trick) — returns the raw arguments
 * string, caller does JSON.parse()/parseAgentJSON(). `tier` is accepted for call-
 * site compatibility but Claude has one model; it doesn't change which model runs.
 */
export async function callWithTools(
  params: ToolCallParams,
  _tier: 'economy' | 'reasoning' | 'premium' = 'reasoning'
): Promise<string> {
  return callClaudeWithForcedTool({
    messages: params.messages.filter(m => m.role !== 'system').map(m => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content,
    })) as ClaudeMessage[],
    systemPrompt: params.messages.find(m => m.role === 'system')?.content,
    temperature:  params.temperature,
    max_tokens:   params.max_tokens,
    tools:        params.tools,
    tool_name:    params.tool_name,
  });
}

// ── Streaming ─────────────────────────────────────────────────────────────────

/**
 * Stream tokens from Claude. Use for UX-only parallel calls — fail fast,
 * suppress errors at call site. `tier` is accepted for call-site compatibility.
 */
export async function* callReasoningStream(
  params: Omit<RouterCallParams, 'response_format'>
): AsyncGenerator<string> {
  yield* streamClaude({
    messages: params.messages.filter(m => m.role !== 'system').map(m => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content,
    })) as ClaudeMessage[],
    systemPrompt: params.messages.find(m => m.role === 'system')?.content,
    temperature:  params.temperature,
    max_tokens:   params.max_tokens,
  });
}

/**
 * Stream tokens from Claude. Use for cheap preview text during Agent 4 generation.
 */
export async function* callEconomyStream(
  params: Omit<RouterCallParams, 'response_format'>
): AsyncGenerator<string> {
  yield* streamClaude({
    messages: params.messages.filter(m => m.role !== 'system').map(m => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content,
    })) as ClaudeMessage[],
    systemPrompt: params.messages.find(m => m.role === 'system')?.content,
    temperature:  params.temperature,
    max_tokens:   params.max_tokens,
  });
}

// ── Claude strategic tier ─────────────────────────────────────────────────────

/**
 * Strategic — Claude claude-sonnet-4-6.
 * Agent 3 (Curriculum Builder) and Agent 5 (Recalibrator) when USE_CLAUDE_FOR_* flags are on.
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
 * Falls back to callStrategic() when Claude is disabled (VITE_CLAUDE_ENABLED).
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
 * Only available when Claude is enabled (VITE_CLAUDE_ENABLED); throws otherwise.
 */
export async function callStrategicWithTools(
  params: ClaudeToolCallParams,
) {
  if (!isClaudeAvailable()) {
    throw new Error('[AI Router] callStrategicWithTools requires Claude enabled (VITE_CLAUDE_ENABLED=true)');
  }
  return _callClaudeWithTools(params);
}
