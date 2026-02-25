#!/usr/bin/env node
/**
 * scripts/verify-rag.ts
 *
 * Quick sanity-check for the RAG knowledge base:
 *   - Shows row count + embedding coverage in knowledge_chunks
 *   - Runs a test semantic query and prints the top result
 *
 * Usage:
 *   npm run rag:verify
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const JINA_KEY     = process.env.VITE_JINA_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function embedQuery(text: string): Promise<number[]> {
  const res = await fetch('https://api.jina.ai/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${JINA_KEY}` },
    body: JSON.stringify({
      model: 'jina-embeddings-v3', input: [text],
      task: 'retrieval.query', dimensions: 1024, normalized: true,
    }),
  });
  if (!res.ok) throw new Error(`Jina ${res.status}: ${await res.text()}`);
  const data = await res.json() as { data: Array<{ embedding: number[] }> };
  return data.data[0].embedding;
}

async function main() {
  console.log('🔍  RAG Knowledge Base — Status\n');

  // 1. Row count
  const { count, error: countErr } = await supabase
    .from('knowledge_chunks')
    .select('*', { count: 'exact', head: true });

  if (countErr) { console.error('❌  Query failed:', countErr.message); process.exit(1); }

  // 2. Embedding coverage
  const { count: embedded, error: embErr } = await supabase
    .from('knowledge_chunks')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);

  if (embErr) { console.error('❌  Query failed:', embErr.message); process.exit(1); }

  console.log(`  Total rows:     ${count ?? 0}`);
  console.log(`  With embedding: ${embedded ?? 0}`);

  if ((count ?? 0) === 0) {
    console.log('\n  ⚠   Table is empty — run: npm run rag:ingest');
    return;
  }

  // 3. Test semantic query (only if Jina key is set)
  if (!JINA_KEY) {
    console.log('\n  ⚠   VITE_JINA_API_KEY not set — skipping semantic query test');
    return;
  }

  console.log('\n  Testing semantic query: "how to start a new habit when unmotivated"...\n');

  const queryEmbedding = await embedQuery('how to start a new habit when unmotivated');

  const { data, error: rpcErr } = await supabase
    .rpc('match_knowledge_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.35,
      match_count: 3,
    });

  if (rpcErr) {
    console.error('  ❌  RPC failed:', rpcErr.message);
    console.log('     Ensure the migration has been applied: npm run db:reset');
    return;
  }

  if (!data || data.length === 0) {
    console.log('  ⚠   No results above threshold 0.35');
    console.log('     Try re-ingesting: npm run rag:ingest');
    return;
  }

  console.log(`  Top ${data.length} results:\n`);
  for (const row of data) {
    console.log(`  [${(row.similarity as number).toFixed(3)}] ${row.chunk_id}`);
    console.log(`         ${String(row.content).slice(0, 100).replace(/\n/g, ' ')}...\n`);
  }

  console.log('✅  Semantic retrieval is working correctly.\n');
}

main().catch(err => {
  console.error('\n❌  Verify failed:', (err as Error).message);
  process.exit(1);
});
