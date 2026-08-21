/**
 * Claude Client — the sole LLM provider for this app.
 *
 * Wraps the Anthropic SDK with four call modes:
 *   callClaude()              — standard JSON output
 *   callClaudeWithForcedTool() — single-shot forced tool call (structured-output trick,
 *                                mirrors OpenAI-style function calling; used by
 *                                ai-router's callWithTools())
 *   callClaudeWithTools()     — native multi-turn tool use (Agent 5 tool-use loop)
 *   callClaudeWithThinking()  — extended thinking (Agent 3 curriculum design, 8k tokens)
 *
 * All methods throw on hard errors; callers handle retry/fallback (see
 * orchestrator.ts's withContentRetry and each agent's own error handling).
 */

import Anthropic from '@anthropic-ai/sdk';
import { env } from '@config/env';
import { proxyFetch } from './ai-proxy-fetch';

const CLAUDE_SONNET = 'claude-sonnet-4-6';

export function isClaudeAvailable(): boolean {
  // Availability is a secret-free feature flag; the real key lives in the edge
  // function. (Previously read the Anthropic key from the browser env, which shipped it.)
  return env.CLAUDE_ENABLED;
}

// Conservative ceiling against a genuinely hung request — not tuned for snappy
// UX (extended-thinking calls with a large budget_tokens can legitimately take
// well over a minute), just to guarantee no call hangs indefinitely.
const CALL_TIMEOUT_MS = 120_000;

function makeClient(): Anthropic {
  // Routes through ai-proxy (which injects the real x-api-key). `apiKey` is a
  // dummy; proxyFetch attaches the user's JWT and strips the SDK's x-api-key.
  return new Anthropic({
    apiKey: 'proxy',
    baseURL: `${env.AI_PROXY_URL}/anthropic`,
    fetch: proxyFetch,
    dangerouslyAllowBrowser: true,
    timeout: CALL_TIMEOUT_MS,
  });
}

// ── Shared types ──────────────────────────────────────────────────────────────

export interface ClaudeMessage {
  role:    'user' | 'assistant';
  content: string;
}

export interface ClaudeCallParams {
  messages:        ClaudeMessage[];
  systemPrompt?:   string;
  temperature?:    number;
  max_tokens?:     number;
}

export interface ClaudeToolSchema {
  name:         string;
  description:  string;
  input_schema: Record<string, unknown>;
}

export interface ClaudeToolCallParams extends ClaudeCallParams {
  tools: ClaudeToolSchema[];
  /** Called for each tool invocation; return value is sent back as tool_result. */
  toolHandler: (name: string, input: Record<string, unknown>) => Promise<string>;
}

export interface ClaudeThinkingParams {
  messages:      ClaudeMessage[];
  systemPrompt?: string;
  budgetTokens?: number;  // default 8000
  max_tokens?:   number;  // default 12000 (must exceed budgetTokens)
}

export interface ClaudeThinkingResult {
  thinking: string;
  output:   string;
}

// Tool use result for callers that don't need multi-turn (just the final text)
export interface ClaudeToolResult {
  finalText: string;
  toolCalls: Array<{ name: string; input: Record<string, unknown>; result: string }>;
}

// ── Standard call ─────────────────────────────────────────────────────────────

/**
 * Standard single-turn Claude call — matches RouterCompletion interface.
 */
export async function callClaude(params: ClaudeCallParams): Promise<string> {
  const client = makeClient();
  const response = await client.messages.create({
    model:       CLAUDE_SONNET,
    max_tokens:  params.max_tokens ?? 4096,
    temperature: params.temperature ?? 0.3,
    system:      params.systemPrompt,
    messages:    params.messages,
  });
  return response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');
}

// ── Forced single tool call (structured-output trick) ─────────────────────────
// OpenAI-style function-calling shape — the schema itself isn't provider-specific
// (standard JSON Schema under `parameters`), only the outer wrapper differs from
// Claude's `input_schema` field. Kept in this shape so existing tool-schema
// constants (ANALYZE_GOAL_TOOL, GENERATE_TASK_TOOL, etc.) don't need rewriting.

export interface ForcedToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}

export interface ClaudeForcedToolParams {
  messages:      ClaudeMessage[];
  systemPrompt?: string;
  temperature?:  number;
  max_tokens?:   number;
  tools:         ForcedToolSchema[];
  tool_name:     string; // forces tool_choice to this specific function
}

/**
 * Single-shot forced tool call — a structured-output trick, NOT the multi-turn
 * agentic loop (see callClaudeWithTools for that). Forces Claude to call exactly
 * one named tool and returns its raw (stringified) input; caller does
 * JSON.parse()/parseAgentJSON(). This is the Claude equivalent of the old
 * Groq-native callGroqWithTools() — same contract, so ai-router's callWithTools()
 * callers never needed to change.
 */
export async function callClaudeWithForcedTool(params: ClaudeForcedToolParams): Promise<string> {
  const client = makeClient();
  const anthropicTools: Anthropic.Messages.Tool[] = params.tools.map(t => ({
    name:         t.function.name,
    description:  t.function.description,
    input_schema: t.function.parameters as Anthropic.Messages.Tool['input_schema'],
  }));

  const response = await client.messages.create({
    model:       CLAUDE_SONNET,
    max_tokens:  params.max_tokens ?? 4096,
    temperature: params.temperature ?? 0.3,
    system:      params.systemPrompt,
    messages:    params.messages,
    tools:       anthropicTools,
    tool_choice: { type: 'tool', name: params.tool_name },
  });

  const toolUse = response.content.find(b => b.type === 'tool_use') as
    { type: 'tool_use'; input: Record<string, unknown> } | undefined;
  if (!toolUse) throw new Error('Claude did not return a tool call — increase max_tokens or check the tool schema');
  return JSON.stringify(toolUse.input);
}

// ── Tool use (multi-turn agentic loop) ────────────────────────────────────────

/**
 * Multi-turn tool-use loop — Claude calls tools until it produces a final response.
 * `toolHandler` is called synchronously from the loop; it must return a string result.
 * Exits after 10 rounds to prevent runaway loops.
 */
export async function callClaudeWithTools(params: ClaudeToolCallParams): Promise<ClaudeToolResult> {
  const client = makeClient();
  const toolCalls: ClaudeToolResult['toolCalls'] = [];

  const anthropicTools: Anthropic.Messages.Tool[] = params.tools.map(t => ({
    name:         t.name,
    description:  t.description,
    input_schema: t.input_schema as Anthropic.Messages.Tool['input_schema'],
  }));

  let messages: Anthropic.Messages.MessageParam[] = params.messages.map(m => ({
    role:    m.role,
    content: m.content,
  }));

  const MAX_ROUNDS = 10;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await client.messages.create({
      model:       CLAUDE_SONNET,
      max_tokens:  params.max_tokens ?? 4096,
      temperature: params.temperature ?? 0.3,
      system:      params.systemPrompt,
      messages,
      tools:       anthropicTools,
    });

    if (response.stop_reason === 'end_turn') {
      const finalText = response.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('');
      return { finalText, toolCalls };
    }

    if (response.stop_reason !== 'tool_use') break;

    // Process tool calls
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use') as
      Array<{ type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }>;

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      const result = await params.toolHandler(block.name, block.input);
      toolCalls.push({ name: block.name, input: block.input, result });
      toolResults.push({
        type:        'tool_result',
        tool_use_id: block.id,
        content:     result,
      });
    }

    // Append assistant turn + tool results to conversation
    messages = [
      ...messages,
      { role: 'assistant', content: response.content },
      { role: 'user',      content: toolResults },
    ];
  }

  // Fell out of loop — return whatever text we have
  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
  const fallback = Array.isArray(lastAssistant?.content)
    ? (lastAssistant.content as Array<{ type?: string; text?: string }>)
        .filter(b => b.type === 'text').map(b => b.text ?? '').join('')
    : '';
  return { finalText: fallback, toolCalls };
}

// ── Extended thinking ─────────────────────────────────────────────────────────

/**
 * Extended thinking call — Claude reasons before producing output.
 * `budgetTokens` controls how much thinking is allowed (default 8 000).
 * `max_tokens` must be > budgetTokens (default 12 000).
 */
export async function callClaudeWithThinking(
  params: ClaudeThinkingParams,
): Promise<ClaudeThinkingResult> {
  const budgetTokens = params.budgetTokens ?? 8000;
  const maxTokens    = params.max_tokens   ?? 12000;

  const client = makeClient();
  const response = await client.messages.create({
    model:       CLAUDE_SONNET,
    max_tokens:  maxTokens,
    temperature: 1, // extended thinking requires temperature=1
    system:      params.systemPrompt,
    messages:    params.messages,
    thinking:    { type: 'enabled', budget_tokens: budgetTokens },
  } as Parameters<typeof client.messages.create>[0]);

  let thinking = '';
  let output   = '';

  const responseMsg = response as { content: Array<{ type: string; thinking?: string; text?: string }> };
  for (const block of responseMsg.content) {
    if (block.type === 'thinking') {
      thinking += (block as { type: 'thinking'; thinking: string }).thinking;
    } else if (block.type === 'text') {
      output += (block as { type: 'text'; text: string }).text;
    }
  }

  return { thinking, output };
}

// ── Streaming ─────────────────────────────────────────────────────────────────

/**
 * Stream tokens from Claude. Each yielded string is a content delta. Fails fast —
 * no retry logic; callers use this for UX-only effects (e.g. a live-typing
 * coach-voice message) and should suppress errors silently at the call site.
 */
export async function* streamClaude(
  params: ClaudeCallParams,
): AsyncGenerator<string, void, unknown> {
  const client = makeClient();
  const stream = await client.messages.create({
    model:       CLAUDE_SONNET,
    max_tokens:  params.max_tokens ?? 4096,
    temperature: params.temperature ?? 0.7,
    system:      params.systemPrompt,
    messages:    params.messages,
    stream:      true,
  });
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}
