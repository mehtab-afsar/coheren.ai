/**
 * Dedicated Supabase client for RAG (knowledge retrieval).
 *
 * Separate from the auth client in supabase.ts by design:
 *   - No session persistence — knowledge queries are stateless
 *   - No auth token injection — knowledge_chunks has no RLS
 *   - Prevents auth state from leaking into knowledge queries
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '@config/env';

export const ragSupabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession:    false,
      autoRefreshToken:  false,
      detectSessionInUrl: false,
      storageKey: 'sb-rag-anon-client', // unique key prevents "Multiple GoTrueClient" warning
    },
  }
);

// ─── Row type returned by match_knowledge_chunks RPC ─────────────────────────

export interface KnowledgeChunkRow {
  chunk_id:   string;
  content:    string;
  source:     string;
  categories: string[];
  keywords:   string[];
  similarity: number;
}
