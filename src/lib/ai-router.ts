/**
 * AI Router — Claude, per-agent-tier models (see TIER_MODELS in claude-client).
 *
 * All agents call one of these public functions:
 *   callEconomy()                → Claude Haiku 4.5   Task Generator (fast, cheap JSON)
 *   callReasoning()              → Claude Sonnet 5    Goal Analyzer, Stone Identifier, Recalibrator, retries
 *   callPremium()                → Claude Opus 5      Curriculum Builder
 *   callStrategic()              → Claude Opus 5      Agent 3 + 5 strategic path
 *   callStrategicWithThinking()  → Claude Opus 5 + adaptive thinking   Agent 3 curriculum design
 *   callWithTools(tier)          → forced single tool call on the tier's model (structured-output trick)
 *   callStrategicWithTools()     → multi-turn agentic tool-use loop
 *
 * The client is model-aware: it drops `temperature` and uses adaptive thinking on
 * the 5-gen models (Opus 5 / Sonnet 5), which reject sampling + budget_tokens.
 * Adding a fallback provider: append a ProviderAdapter to the relevant chain.
 */

import {
  callClaude,
  callClaudeWithThinking,
  callClaudeWithForcedTool,
  streamClaude,
  isClaudeAvailable,
  TIER_MODELS,
  type ModelTier,
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

// One Claude adapter per tier, each pinned to its own model (Haiku / Sonnet 5 /
// Opus 5). The client is model-aware (drops temperature + uses adaptive thinking
// on the 5-gen models), so the router just passes the tier's model through.
function makeClaudeAdapter(tier: ModelTier): ProviderAdapter {
  const model = TIER_MODELS[tier];
  return {
    name: 'claude', model,
    isAvailable: () => isClaudeAvailable(),
    async call(params) {
      const content = await callClaude({
        model,
        messages: params.messages.filter(m => m.role !== 'system').map(m => ({
          role:    m.role as 'user' | 'assistant',
          content: m.content,
        })) as ClaudeMessage[],
        systemPrompt: params.messages.find(m => m.role === 'system')?.content,
        temperature:  params.temperature,
        max_tokens:   params.max_tokens,
      });
      return { content, provider: 'claude', model };
    },
  };
}

// ── Provider chains ───────────────────────────────────────────────────────────
// One adapter per tier. Kept as arrays so a second provider could be appended as
// a fallback later without changing routeCall's shape.

const ECONOMY_CHAIN:   ProviderAdapter[] = [makeClaudeAdapter('economy')];
const REASONING_CHAIN: ProviderAdapter[] = [makeClaudeAdapter('reasoning')];
const PREMIUM_CHAIN:   ProviderAdapter[] = [makeClaudeAdapter('premium')];

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
  tier: ModelTier = 'reasoning'
): Promise<string> {
  return callClaudeWithForcedTool({
    model: TIER_MODELS[tier],
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
    model: TIER_MODELS.premium,
    messages: params.messages.filter(m => m.role !== 'system').map(m => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content,
    })) as ClaudeMessage[],
    systemPrompt: params.messages.find(m => m.role === 'system')?.content,
    temperature:  params.temperature,
    max_tokens:   params.max_tokens,
  });
  return { content, provider: 'claude', model: TIER_MODELS.premium };
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
    model: TIER_MODELS.premium,
    messages: params.messages.filter(m => m.role !== 'system').map(m => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content,
    })) as ClaudeMessage[],
    systemPrompt: params.messages.find(m => m.role === 'system')?.content,
    budgetTokens: params.budgetTokens ?? 8000,
    max_tokens:   params.max_tokens ?? 16000,
  });
  return {
    content:  result.output,
    thinking: result.thinking,
    provider: 'claude',
    model:    TIER_MODELS.premium,
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
