/**
 * Semantic Retriever
 *
 * Pipeline: user query → Jina embedding → Supabase pgvector cosine search → formatted context
 *
 * Returns '' (empty string) on any failure so callers can fall back to
 * the static knowledge base without branching on error types.
 */

import { ragSupabase, type KnowledgeChunkRow } from '@lib/rag-supabase';
import { embedQuery } from '@lib/jina-client';
import { env } from '@config/env';

const SIMILARITY_THRESHOLD = 0.35;
const MATCH_COUNT          = 4;

export interface SemanticRetrievalOptions {
  query:          string;
  matchThreshold?: number;
  matchCount?:     number;
}

/**
 * Retrieve the most relevant knowledge chunks for a given query.
 *
 * Returns a formatted string ready for prompt injection, or '' if:
 *   - VITE_JINA_API_KEY is not configured
 *   - Supabase returns no results above the threshold
 *   - Any network/API error occurs
 */
export async function retrieveKnowledgeSemantic(
  options: SemanticRetrievalOptions
): Promise<string> {
  const {
    query,
    matchThreshold = SIMILARITY_THRESHOLD,
    matchCount     = MATCH_COUNT,
  } = options;

  const jinaKey = env.JINA_API_KEY || undefined;
  if (!jinaKey || !query.trim()) return '';

  try {
    // 1. Embed the query (retrieval.query task — asymmetric, not retrieval.passage)
    const queryEmbedding = await embedQuery(query, jinaKey);
    if (queryEmbedding.length === 0) return '';

    // 2. Cosine similarity search via Supabase RPC
    const { data, error } = await ragSupabase
      .rpc('match_knowledge_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count:     matchCount,
      })
      .returns<KnowledgeChunkRow[]>();

    if (error || !data || !Array.isArray(data) || data.length === 0) return '';

    // 3. Format identically to the static retriever's output format
    const rows = data as KnowledgeChunkRow[];
    const formatted = rows
      .map(row => `[${row.source}]\n${row.content}`)
      .join('\n\n---\n\n');

    return `SCIENTIFIC KNOWLEDGE BASE:\n\n${formatted}`;

  } catch {
    // Network failure, quota exceeded, etc. — caller falls back to static
    return '';
  }
}
