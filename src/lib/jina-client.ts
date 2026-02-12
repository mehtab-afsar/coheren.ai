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

type JinaTask = 'retrieval.query' | 'retrieval.passage';

interface JinaEmbeddingResponse {
  data:  Array<{ embedding: number[]; index: number }>;
  usage: { prompt_tokens: number; total_tokens: number };
}

const JINA_API_URL  = 'https://api.jina.ai/v1/embeddings';
const JINA_MODEL    = 'jina-embeddings-v3';
const JINA_DIMS     = 1024;

async function callJina(
  texts:  string[],
  task:   JinaTask,
  apiKey: string
): Promise<number[][]> {
  const response = await fetch(JINA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
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
