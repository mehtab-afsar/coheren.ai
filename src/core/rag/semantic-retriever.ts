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
import { embedQuery, rerankDocuments } from '@lib/jina-client';
import { env } from '@config/env';
import { flags } from '@config/feature-flags';
import { getBm25Candidates } from './knowledge-base';

const SIMILARITY_THRESHOLD = 0.25;
const MATCH_COUNT          = 6;
// When RAPTOR is on, fetch more candidates so summaries have a chance to surface
const RAPTOR_MATCH_MULTIPLIER = 1.5;

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

// ─── Shared boost helper ──────────────────────────────────────────────────────

const CATEGORY_BOOST = 0.08;
const KEYWORD_BOOST  = 0.05;

function applyBoost(
  rows: KnowledgeChunkRow[],
  boostCategories: string[],
  boostKeywords:   string[],
): Array<KnowledgeChunkRow & { boostedSimilarity: number }> {
  return rows.map(row => {
    let boost = 0;
    const lowerCategories = (row.categories ?? []).map((c: string) => c.toLowerCase());
    const lowerKeywords   = (row.keywords   ?? []).map((k: string) => k.toLowerCase());
    for (const cat of boostCategories) {
      if (lowerCategories.includes(cat.toLowerCase())) boost += CATEGORY_BOOST;
    }
    for (const kw of boostKeywords) {
      if (lowerKeywords.some((k: string) => k.includes(kw.toLowerCase()))) boost += KEYWORD_BOOST;
    }
    return { ...row, boostedSimilarity: row.similarity + boost };
  });
}

function formatChunks(chunks: Array<{ source: string; content: string }>): string {
  const body = chunks.map(c => `[${c.source}]\n${c.content}`).join('\n\n---\n\n');
  return body ? `SCIENTIFIC KNOWLEDGE BASE:\n\n${body}` : '';
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
    additionalQueries = [],
    boostCategories = [],
    boostKeywords = [],
  } = options;

  // RAPTOR: fetch extra candidates when hierarchical index is enabled
  const matchCount = flags.USE_RAPTOR_INDEX
    ? Math.ceil((options.matchCount ?? MATCH_COUNT) * RAPTOR_MATCH_MULTIPLIER)
    : (options.matchCount ?? MATCH_COUNT);

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

    const boostedChunks = applyBoost(Array.from(chunkMap.values()), boostCategories, boostKeywords);
    boostedChunks.sort((a, b) => b.boostedSimilarity - a.boostedSimilarity);
    const topChunks = boostedChunks.slice(0, matchCount);

    return formatChunks(topChunks);

  } catch {
    // Network failure, quota exceeded, etc. — caller falls back to static
    return '';
  }
}

/**
 * Hybrid BM25 + semantic retrieval with Reciprocal Rank Fusion (RRF) merge.
 *
 * Runs BM25 (client-side, zero latency) and semantic vector search in parallel.
 * Merges via RRF: score(d) = Σ 1/(k + rank_i), k=60.
 * Optionally re-ranks the merged candidates with Jina cross-encoder for best precision.
 *
 * Falls back to '' on any failure so callers can use static fallback.
 */
export async function retrieveKnowledgeHybrid(
  options: SemanticRetrievalOptions
): Promise<string> {
  const {
    query,
    matchThreshold = SIMILARITY_THRESHOLD,
    boostCategories = [],
    boostKeywords   = [],
  } = options;

  const jinaKey = env.JINA_API_KEY || undefined;
  if (!jinaKey || !query.trim()) return '';

  // RAPTOR: fetch a larger candidate pool when hierarchical summaries are present
  const hybridCandidateCount = flags.USE_RAPTOR_INDEX ? 20 : 12;

  try {
    const [semanticRows, bm25Results] = await Promise.all([
      singleQuery(query, jinaKey, matchThreshold, hybridCandidateCount),
      Promise.resolve(getBm25Candidates(query, hybridCandidateCount)),
    ]);

    // Apply boost + sort semantic results
    const boostedSemantic = applyBoost(semanticRows, boostCategories, boostKeywords);
    boostedSemantic.sort((a, b) => b.boostedSimilarity - a.boostedSimilarity);

    // Unified data store keyed by chunk_id
    const chunkData = new Map<string, { content: string; source: string }>();
    for (const row of boostedSemantic) {
      chunkData.set(row.chunk_id, { content: row.content as string, source: row.source as string });
    }
    for (const { chunk } of bm25Results) {
      if (!chunkData.has(chunk.id)) {
        chunkData.set(chunk.id, { content: chunk.content, source: chunk.source });
      }
    }

    // Compute RRF scores
    const rrfScores = new Map<string, number>();
    boostedSemantic.forEach(({ chunk_id }, idx) => {
      rrfScores.set(chunk_id, (rrfScores.get(chunk_id) ?? 0) + 1 / (60 + idx + 1));
    });
    bm25Results.forEach(({ chunk }, idx) => {
      rrfScores.set(chunk.id, (rrfScores.get(chunk.id) ?? 0) + 1 / (60 + idx + 1));
    });

    if (rrfScores.size === 0) return '';

    // Sort by RRF score, take top 16 candidates
    const ranked = [...rrfScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16)
      .map(([id]) => id);

    // Optional Jina Reranker pass — reorders the top-16 by cross-encoder score
    let finalOrder = ranked;
    try {
      const documents = ranked.map(id => chunkData.get(id)?.content ?? '');
      const rerankResults = await rerankDocuments(query, documents, ranked.length, jinaKey);
      finalOrder = rerankResults.map(r => ranked[r.index]).filter(Boolean);
    } catch {
      // Reranker unavailable — keep RRF order
    }

    const finalChunks = finalOrder
      .map(id => chunkData.get(id))
      .filter((c): c is { content: string; source: string } => c !== undefined);

    return formatChunks(finalChunks);

  } catch {
    return '';
  }
}
