/**
 * Semantic Retriever
 *
 * Pipeline: user query → Jina embedding → Supabase pgvector cosine search → formatted context
 *
 * v2: Multi-query retrieval + metadata boosting
 *   - Runs multiple specialized queries in parallel for richer context
 *   - Boosts results whose categories/keywords match the domain or stone
 *   - Deduplicates by chunk_id
 *
 * Returns '' (empty string) on any failure so callers can fall back to
 * the static knowledge base without branching on error types.
 */

import { ragSupabase, type KnowledgeChunkRow } from '@lib/rag-supabase';
import { embedQuery } from '@lib/jina-client';
import { env } from '@config/env';

const SIMILARITY_THRESHOLD = 0.25;
const MATCH_COUNT          = 6;

export interface SemanticRetrievalOptions {
  query:          string;
  matchThreshold?: number;
  matchCount?:     number;
  /** Additional queries to run in parallel for richer context */
  additionalQueries?: string[];
  /** Boost results containing these categories (e.g. domain, stone type) */
  boostCategories?: string[];
  /** Boost results containing these keywords */
  boostKeywords?: string[];
}

/**
 * Run a single embedding + vector search query.
 */
async function singleQuery(
  query: string,
  jinaKey: string,
  matchThreshold: number,
  matchCount: number,
): Promise<KnowledgeChunkRow[]> {
  const queryEmbedding = await embedQuery(query, jinaKey);
  if (queryEmbedding.length === 0) return [];

  const { data, error } = await ragSupabase
    .rpc('match_knowledge_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count:     matchCount,
    })
    .returns<KnowledgeChunkRow[]>();

  if (error || !data || !Array.isArray(data)) return [];
  return data;
}

/**
 * Retrieve the most relevant knowledge chunks for a given query (or set of queries).
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
    additionalQueries = [],
    boostCategories = [],
    boostKeywords = [],
  } = options;

  const jinaKey = env.JINA_API_KEY || undefined;
  if (!jinaKey || !query.trim()) return '';

  try {
    // Run all queries in parallel
    const allQueries = [query, ...additionalQueries.filter(q => q.trim())];
    const results = await Promise.all(
      allQueries.map(q => singleQuery(q, jinaKey, matchThreshold, matchCount))
    );

    // Deduplicate by chunk_id, keeping the highest similarity score
    const chunkMap = new Map<string, KnowledgeChunkRow>();
    for (const batch of results) {
      for (const row of batch) {
        const existing = chunkMap.get(row.chunk_id);
        if (!existing || row.similarity > existing.similarity) {
          chunkMap.set(row.chunk_id, row);
        }
      }
    }

    if (chunkMap.size === 0) return '';

    // Apply metadata boosting — add a bonus to similarity for category/keyword matches
    const CATEGORY_BOOST = 0.08;
    const KEYWORD_BOOST = 0.05;
    const boostedChunks = Array.from(chunkMap.values()).map(row => {
      let boost = 0;
      const lowerCategories = (row.categories ?? []).map(c => c.toLowerCase());
      const lowerKeywords = (row.keywords ?? []).map(k => k.toLowerCase());

      for (const cat of boostCategories) {
        if (lowerCategories.includes(cat.toLowerCase())) {
          boost += CATEGORY_BOOST;
        }
      }
      for (const kw of boostKeywords) {
        if (lowerKeywords.some(k => k.includes(kw.toLowerCase()))) {
          boost += KEYWORD_BOOST;
        }
      }

      return { ...row, boostedSimilarity: row.similarity + boost };
    });

    // Sort by boosted similarity, take top matchCount results
    boostedChunks.sort((a, b) => b.boostedSimilarity - a.boostedSimilarity);
    const topChunks = boostedChunks.slice(0, matchCount);

    // Format identically to the static retriever's output format
    const formatted = topChunks
      .map(row => `[${row.source}]\n${row.content}`)
      .join('\n\n---\n\n');

    return `SCIENTIFIC KNOWLEDGE BASE:\n\n${formatted}`;

  } catch {
    // Network failure, quota exceeded, etc. — caller falls back to static
    return '';
  }
}
