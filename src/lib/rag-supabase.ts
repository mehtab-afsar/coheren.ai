/**
 * Dedicated Supabase client for RAG (knowledge retrieval).
 *
 * Separate from the auth client in supabase.ts by design:
 *   - No session persistence — knowledge queries are stateless
 *   - No auth token injection — knowledge_chunks has no RLS
 *   - Prevents auth state from leaking into knowledge queries
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const ragSupabase = createClient(
  supabaseUrl     ?? 'http://127.0.0.1:54321',
  supabaseAnonKey ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession:   false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
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
