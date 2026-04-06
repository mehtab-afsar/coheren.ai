/**
 * RAG Reranker — Jina cross-encoder second-stage reranking
 *
 * Architecture:
 *   Stage 1 (existing): pgvector cosine similarity → top-16 candidates
 *   Stage 2 (this file): Jina cross-encoder → rerank to top-N
 *
 * Research basis:
 *   - Nogueira & Cho (2019) — cross-encoder reranking outperforms bi-encoder alone
 *   - ColBERT Recall@50 > BM25 Recall@1000 (Khattab & Zaharia 2020)
 *   - Jina Reranker v2 is a cross-encoder fine-tuned on MS-MARCO (multilingual)
 *   - Combined with contextual retrieval: 67% retrieval failure reduction (Anthropic 2024)
 *
 * Used when USE_COLBERT_RERANKING flag is on.
 * Falls back to returning original order if Jina API is unavailable.
 */

import { rerankDocuments } from '@lib/jina-client';
import type { KnowledgeChunkRow } from '@lib/rag-supabase';
import { env } from '@config/env';

// Top-N returned after reranking (caller retrieves top-16, we return top-5)
const DEFAULT_TOP_N = 5;

/**
 * Rerank knowledge chunks using Jina cross-encoder.
 *
 * @param query   - The original retrieval query
 * @param chunks  - Candidate chunks from Stage 1 (up to 16)
 * @param topN    - Number of chunks to return after reranking (default: 5)
 * @returns       - Reranked subset of input chunks, highest relevance first
 */
export async function rerankChunks(
  query:  string,
  chunks: KnowledgeChunkRow[],
  topN:   number = DEFAULT_TOP_N,
): Promise<KnowledgeChunkRow[]> {
  if (chunks.length === 0) return [];
  if (chunks.length <= topN)  return chunks;  // No reranking needed if already ≤ topN

  const apiKey = env.JINA_API_KEY;
  if (!apiKey) {
    // No API key — fall back to original cosine similarity order
    return chunks.slice(0, topN);
  }

  try {
    // Extract text for reranking — prefer enriched_content if available (contextual retrieval)
    const documents = chunks.map(c => {
      const enriched = (c as KnowledgeChunkRow & { enriched_content?: string }).enriched_content;
      return enriched ?? c.content;
    });

    const reranked = await rerankDocuments(query, documents, topN, apiKey);

    // Map reranked results back to original chunk objects
    return reranked
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .map(r => ({
        ...chunks[r.index],
        // Inject reranker score as similarity override so downstream callers see it
        similarity: r.relevance_score,
      }));
  } catch (err) {
    // Graceful fallback — log and return original order truncated to topN
    console.warn('[reranker] Jina cross-encoder failed, falling back to cosine order:', err);
    return chunks.slice(0, topN);
  }
}

/**
 * Rerank plain text strings (for callers who don't use KnowledgeChunkRow).
 * Returns the reranked strings in relevance order.
 */
export async function rerankStrings(
  query:     string,
  documents: string[],
  topN:      number = DEFAULT_TOP_N,
): Promise<string[]> {
  if (documents.length === 0) return [];
  if (documents.length <= topN) return documents;

  const apiKey = env.JINA_API_KEY;
  if (!apiKey) return documents.slice(0, topN);

  try {
    const reranked = await rerankDocuments(query, documents, topN, apiKey);
    return reranked
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .map(r => r.document.text);
  } catch (err) {
    console.warn('[reranker] Jina string rerank failed, falling back:', err);
    return documents.slice(0, topN);
  }
}
