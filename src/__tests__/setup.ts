/**
 * Global Vitest setup — runs before every test file.
 *
 * Mocks all network-dependent modules so pure-logic tests never hit the network.
 * Anything in this file applies to ALL test suites automatically.
 */

import { vi } from 'vitest';

// ── Mock AI router (Groq) ─────────────────────────────────────────────────────
// Tests that exercise pure logic should never make real LLM calls.
vi.mock('@lib/ai-router', () => ({
  callEconomy:   vi.fn().mockResolvedValue('{}'),
  callReasoning: vi.fn().mockResolvedValue('{}'),
  callStandard:  vi.fn().mockResolvedValue('{}'),
}));

// ── Mock RAG semantic retriever ───────────────────────────────────────────────
vi.mock('@core/rag/semantic-retriever', () => ({
  retrieveKnowledgeSemantic: vi.fn().mockResolvedValue(''),
}));

// ── Mock Supabase client ──────────────────────────────────────────────────────
vi.mock('@lib/supabase', () => ({
  supabase:       { from: vi.fn(), auth: { getSession: vi.fn() } },
  getCurrentUser: vi.fn().mockResolvedValue(null),
}));

// ── Mock analytics ────────────────────────────────────────────────────────────
vi.mock('@lib/analytics', () => ({
  track:    vi.fn(),
  identify: vi.fn(),
}));

// ── Mock resource matcher ────────────────────────────────────────────────────
vi.mock('@lib/resourceMatcher', () => ({
  matchTaskToResources: vi.fn().mockResolvedValue({ primary: null, supplementary: [] }),
}));
