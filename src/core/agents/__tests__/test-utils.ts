/**
 * Shared helpers for golden-output regression tests.
 *
 * Each test file still needs its own `vi.mock('@lib/ai-router', () => ({ ... }))`
 * at module scope — vitest hoists `vi.mock` per-file, so it can't be shared through
 * a helper call. Import the mocked functions from '@lib/ai-router' after mocking
 * and use `queueContent` below to control what "the LLM said" per test.
 *
 * Pattern:
 *   vi.mock('@lib/ai-router', () => ({
 *     callReasoning: vi.fn(),
 *     callWithTools: vi.fn(),
 *   }));
 *   import { callReasoning } from '@lib/ai-router';
 *   ...
 *   queueContent(callReasoning, '```json\n{"foo": "bar"}\n```');
 */
import type { Mock } from 'vitest';

/** Queue a raw content string as the next resolved value of a mocked router call. */
export function queueContent(mockFn: Mock, content: string): void {
  mockFn.mockResolvedValueOnce({ content, provider: 'groq', model: 'test' });
}

/** A markdown-fenced JSON body with a trailing comma — the realistic "messy LLM output" case. */
export function fence(json: string): string {
  return `Here you go:\n\`\`\`json\n${json}\n\`\`\`\nLet me know if you need changes.`;
}
