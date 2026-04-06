/**
 * Claude Client — Change 3 (Claude Integration for Complex Agents)
 *
 * Wraps the Anthropic SDK with three call modes:
 *   callClaude()              — standard JSON output (mirrors callGroqWithFallback)
 *   callClaudeWithTools()     — native multi-turn tool use (Agent 5 tool-use loop)
 *   callClaudeWithThinking()  — extended thinking (Agent 3 curriculum design, 8k tokens)
 *
 * Falls back gracefully — callers in ai-router.ts check isAvailable() before calling.
 * All methods throw on hard errors; ai-router's chain mechanism handles retry/fallback.
 */

import Anthropic from '@anthropic-ai/sdk';

const CLAUDE_SONNET = 'claude-sonnet-4-6';

function getApiKey(): string {
  return (import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined) ?? '';
}

export function isClaudeAvailable(): boolean {
  return Boolean(getApiKey());
}

function makeClient(): Anthropic {
  return new Anthropic({ apiKey: getApiKey(), dangerouslyAllowBrowser: true });
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
