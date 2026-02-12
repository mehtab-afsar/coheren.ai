#!/usr/bin/env tsx
/**
 * RAG Semantic Stress Test
 *
 * Verifies the full pipeline:
 *   Query → Jina embedding → Supabase pgvector cosine search → Expert context
 *
 * Tests conceptual understanding (not keyword matching):
 *   A query about "feeling stuck despite effort" should retrieve the Atomic Habits
 *   chapter on the Plateau of Latent Potential — without the word appearing in the query.
 *
 * Run: npx tsx scripts/verify-rag.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// ─── .env loader ─────────────────────────────────────────────────────────────

function loadEnv(): Record<string, string> {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
    const env: Record<string, string> = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    }
    return env;
  } catch { return {}; }
}

const env = loadEnv();
const SUPABASE_URL  = env.VITE_SUPABASE_URL          ?? '';
const ANON_KEY      = env.VITE_SUPABASE_ANON_KEY     ?? '';
const JINA_API_KEY  = env.VITE_JINA_API_KEY          ?? '';

// ─── Supabase client (anon — same as browser client) ─────────────────────────

const supabase = createClient(SUPABASE_URL || 'http://127.0.0.1:54321', ANON_KEY || '', {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Jina embedding (query task) ─────────────────────────────────────────────

async function embedQuery(text: string): Promise<number[]> {
  const res = await fetch('https://api.jina.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${JINA_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'jina-embeddings-v3',
      input: [text],
      task: 'retrieval.query',
      dimensions: 1024,
      normalized: true,
    }),
  });

  if (!res.ok) throw new Error(`Jina error ${res.status}: ${await res.text()}`);
  const data = await res.json() as { data: Array<{ embedding: number[] }> };
  return data.data[0]?.embedding ?? [];
}

// ─── Supabase pgvector search ─────────────────────────────────────────────────

interface KnowledgeRow {
  chunk_id:   string;
  content:    string;
  source:     string;
  similarity: number;
}

async function semanticSearch(
  query: string,
  threshold = 0.35,
  count = 4
): Promise<KnowledgeRow[]> {
  const embedding = await embedQuery(query);
  const { data, error } = await supabase
    .rpc('match_knowledge_chunks', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count:     count,
    })
    .returns<KnowledgeRow[]>();

  if (error) throw new Error(`Supabase RPC error: ${error.message}`);
  return data ?? [];
}

// ─── Static fallback check ────────────────────────────────────────────────────

async function checkChunkCount(): Promise<number> {
  const { count } = await supabase
    .from('knowledge_chunks')
    .select('*', { count: 'exact', head: true });
  return count ?? 0;
}

// ─── Test runner ──────────────────────────────────────────────────────────────

interface TestQuery {
  label:          string;
  query:          string;
  expectContains: string[];   // Any of these strings should appear in retrieved content
  description:    string;     // What we're testing
}

const TEST_QUERIES: TestQuery[] = [
  {
    label: '1. Plateau of Latent Potential',
    query: "I've been working hard every single day but I see zero results. I feel like quitting.",
    expectContains: ['compound', 'plateau', 'bamboo', 'invisible', '1%', 'progress', 'latent'],
    description: 'Conceptual — no keyword overlap with query. Should match Atomic Habits compounding chapter.',
  },
  {
    label: '2. Dopamine & Habit Wiring',
    query: 'How does the brain actually lock in a new habit after you repeat it?',
    expectContains: ['dopamine', 'basal ganglia', 'neural', 'automatic', 'reinforce'],
    description: 'Neuroscience retrieval — tests that the brain/dopamine passages are indexed.',
  },
  {
    label: '3. Low Motivation Recovery',
    query: "I just don't feel like doing my habit today. I'm tired and unmotivated.",
    expectContains: ['tiny', 'two-minute', 'motivation', 'small', 'anchor', 'easy'],
    description: 'Emotional state → behavioral strategy. Should retrieve 2-minute rule / tiny habits.',
  },
  {
    label: '4. Fear of Failure / Quitting Pattern',
    query: 'I always start strong and then stop after two or three weeks. Why does this keep happening?',
    expectContains: ['plateau', 'quit', 'visible', 'motivation', 'bamboo', 'persist', 'compound'],
    description: 'Behavioral pattern → habit loop science. Should match missing-days / habit-loop content.',
  },
  {
    label: '5. Identity Shift',
    query: 'How do I become someone who exercises every day without forcing myself?',
    expectContains: ['identity', 'become', 'vote', 'type of person', 'belief', 'runner'],
    description: 'Identity framing — should retrieve the identity-based habits chapter.',
  },
];

function bar(score: number, width = 16): string {
  const filled = Math.round(score * width);
  return '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + ']';
}

async function main() {
  const W = 72;
  const HR = '─'.repeat(W);

  console.log('\n' + '═'.repeat(W));
  console.log(' COHEREN — RAG SEMANTIC STRESS TEST');
  console.log('═'.repeat(W));

  // ── Pre-flight checks ─────────────────────────────────────────────────────

  console.log('\n PRE-FLIGHT CHECKS\n');

  const hasJina = !!JINA_API_KEY;
  const hasSupa = !!SUPABASE_URL && !!ANON_KEY;
  console.log(`  Jina API key   : ${hasJina ? '✓ present' : '✗ missing — add VITE_JINA_API_KEY to .env'}`);
  console.log(`  Supabase URL   : ${hasSupa ? '✓ present' : '✗ missing'}`);

  if (!hasJina) {
    console.log('\n  ⚠  Skipping semantic test — get a free key at https://jina.ai');
    process.exit(0);
  }

  let chunkCount = 0;
  try {
    chunkCount = await checkChunkCount();
    console.log(`  knowledge_chunks: ${chunkCount} rows ${chunkCount === 0 ? '← run: npx tsx scripts/ingest-knowledge.ts' : '✓'}`);
  } catch {
    console.log('  knowledge_chunks: ✗ table not found — run: npx supabase db reset');
    process.exit(1);
  }

  if (chunkCount === 0) {
    console.log('\n  ⚠  No chunks in DB. Run ingestion first:');
    console.log('     npx tsx scripts/ingest-knowledge.ts\n');
    process.exit(1);
  }

  console.log(`\n  Running ${TEST_QUERIES.length} semantic stress tests against ${chunkCount} chunks...\n`);

  // ── Run tests ─────────────────────────────────────────────────────────────

  const results: Array<{ label: string; passed: boolean; topSim: number; matched: string }> = [];

  for (const tc of TEST_QUERIES) {
    console.log(HR);
    console.log(`▶  ${tc.label}`);
    console.log(`   "${tc.query.slice(0, 65)}${tc.query.length > 65 ? '…' : ''}"`);
    console.log(`   ${tc.description}\n`);

    const t0 = Date.now();
    let rows: KnowledgeRow[] = [];
    let error: string | null = null;

    try {
      rows = await semanticSearch(tc.query);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    const ms = Date.now() - t0;

    if (error) {
      console.log(`   ❌ Error: ${error}\n`);
      results.push({ label: tc.label, passed: false, topSim: 0, matched: 'error' });
      continue;
    }

    if (rows.length === 0) {
      console.log('   ⚠  No results above threshold (0.45). Lower match_threshold in the RPC call.\n');
      results.push({ label: tc.label, passed: false, topSim: 0, matched: 'none' });
      continue;
    }

    // Show top results
    for (const row of rows) {
      const simPct = (row.similarity * 100).toFixed(1);
      const preview = row.content.slice(0, 100).replace(/\n/g, ' ');
      console.log(`   ${bar(row.similarity)} ${simPct}%  [${row.source}]`);
      console.log(`   "${preview}…"\n`);
    }

    // Check if any expected concept appears in retrieved content
    const allContent = rows.map(r => r.content.toLowerCase()).join(' ');
    const matched = tc.expectContains.find(kw => allContent.includes(kw.toLowerCase()));
    const passed = !!matched;
    const topSim = rows[0]?.similarity ?? 0;

    if (passed) {
      console.log(`   ✓  Concept retrieved ("${matched}" found in top results)`);
    } else {
      console.log(`   ⚠  Expected concepts not found: ${tc.expectContains.join(', ')}`);
      console.log(`      Sources returned: ${rows.map(r => r.source).join(', ')}`);
    }
    console.log(`   ⏱  ${ms}ms\n`);

    results.push({ label: tc.label, passed, topSim, matched: matched ?? 'none' });
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log('═'.repeat(W));
  console.log(' RESULTS');
  console.log('═'.repeat(W));

  const passed = results.filter(r => r.passed).length;
  const total  = results.length;
  const pct    = ((passed / total) * 100).toFixed(0);

  console.log(`\n  ${passed}/${total} tests passed (${pct}%)\n`);

  for (const r of results) {
    const icon = r.passed ? '✓' : '✗';
    const sim  = r.topSim > 0 ? ` sim=${(r.topSim * 100).toFixed(0)}%` : '';
    console.log(`  ${icon}  ${r.label}${sim}`);
    if (r.matched !== 'error' && r.matched !== 'none' && r.passed) {
      console.log(`     concept matched: "${r.matched}"`);
    }
  }

  console.log('\n' + '═'.repeat(W));

  if (passed === total) {
    console.log(' ✅  FULL PASS — The Expert Brain is working correctly.');
    console.log('    Agents will now retrieve evidence-based context for every user goal.');
  } else if (passed >= total / 2) {
    console.log(' ⚠  PARTIAL PASS — Most retrieval working. Add more content to fill gaps:');
    console.log('    npx tsx scripts/ingest-knowledge.ts');
  } else {
    console.log(' ❌  LOW PASS — Check that ingestion ran successfully:');
    console.log('    npx tsx scripts/ingest-knowledge.ts');
  }

  console.log('═'.repeat(W) + '\n');
  process.exit(passed === total ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
