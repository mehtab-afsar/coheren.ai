/**
 * Jina AI v3 Embedding Client
 *
 * Model: jina-embeddings-v3 (1024 dims, cosine-normalized)
 * Free tier: 1M tokens/month — https://jina.ai
 *
 * Critical: Jina v3 uses task-aware asymmetric embeddings.
 *   - Use 'retrieval.query'   when embedding a search query at runtime
 *   - Use 'retrieval.passage' when embedding documents during ingestion
 * Mixing task types measurably degrades recall.
 */

import { env } from '@config/env';
import { proxyFetch } from './ai-proxy-fetch';

type JinaTask = 'retrieval.query' | 'retrieval.passage';

interface JinaEmbeddingResponse {
  data:  Array<{ embedding: number[]; index: number }>;
  usage: { prompt_tokens: number; total_tokens: number };
}

// Routes through the ai-proxy edge function (which injects the real Jina key).
const JINA_API_URL  = `${env.AI_PROXY_URL}/jina/v1/embeddings`;
const JINA_MODEL    = 'jina-embeddings-v3';
const JINA_DIMS     = 1024;

async function callJina(
  texts:  string[],
  task:   JinaTask,
  _apiKey: string, // ignored — the edge function holds the real key
): Promise<number[][]> {
  const response = await proxyFetch(JINA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:      JINA_MODEL,
      input:      texts,
      task,
      dimensions: JINA_DIMS,
      normalized: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Jina embedding failed (${response.status}): ${body}`);
  }

  const data = await response.json() as JinaEmbeddingResponse;
  return data.data
    .sort((a, b) => a.index - b.index)
    .map(d => d.embedding);
}

/**
 * Embed a single search query at runtime.
 * Uses 'retrieval.query' task for asymmetric query-document matching.
 */
export async function embedQuery(text: string, apiKey: string): Promise<number[]> {
  const results = await callJina([text], 'retrieval.query', apiKey);
  return results[0] ?? [];
}

/**
 * Embed a batch of documents during ingestion.
 * Uses 'retrieval.passage' task — do NOT use this for query-time embedding.
 */
export async function embedDocuments(
  texts:  string[],
  apiKey: string
): Promise<number[][]> {
  return callJina(texts, 'retrieval.passage', apiKey);
}

// ─── Reranker ────────────────────────────────────────────────────────────────

const JINA_RERANK_URL   = `${env.AI_PROXY_URL}/jina/v1/rerank`;
const JINA_RERANK_MODEL = 'jina-reranker-v2-base-multilingual';

export interface JinaRerankResult {
  index:           number;
  relevance_score: number;
  document:        { text: string };
}

interface JinaRerankResponse {
  results: JinaRerankResult[];
}

/**
 * Rerank documents using the Jina cross-encoder reranker.
 * Returns results sorted by relevance_score descending; `index` refers to
 * the position in the input `documents` array.
 */
export async function rerankDocuments(
  query:     string,
  documents: string[],
  topN:      number,
  _apiKey:   string, // ignored — the edge function holds the real key
): Promise<JinaRerankResult[]> {
  const response = await proxyFetch(JINA_RERANK_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:     JINA_RERANK_MODEL,
      query,
      documents,
      top_n:     topN,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Jina reranker failed (${response.status}): ${body}`);
  }

  const data = await response.json() as JinaRerankResponse;
  return data.results;
}
