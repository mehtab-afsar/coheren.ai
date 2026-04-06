#!/usr/bin/env node
/**
 * scripts/build-raptor-index.ts
 *
 * Builds a RAPTOR (Recursive Abstractive Processing for Tree-Organized Retrieval)
 * hierarchical index on top of the existing knowledge_chunks table.
 *
 * Research: Sarthi et al. (2024) — RAPTOR improves retrieval on complex multi-hop
 * queries by building a tree of cluster summaries. Retrieval traverses all tree levels,
 * so a query about "long-term habit maintenance" can retrieve a chapter-level summary
 * rather than only a specific paragraph.
 *
 * Algorithm:
 *   Level 1 — Cluster raw chunks by source file → generate 100-200 word summaries
 *             Embed summaries → upsert with chunk_type='raptor_summary', raptor_level=1
 *   Level 2 — Group level-1 summaries by domain/source → generate document summaries
 *             Embed → upsert with raptor_level=2
 *
 * Prerequisites:
 *   - knowledge_chunks table with chunk_type, raptor_level, raptor_source_ids columns
 *     (migration 20260402000006_raptor_index.sql)
 *   - VITE_JINA_API_KEY, VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   - VITE_GROQ_API_KEY (for summary generation — cheap via llama-3.1-8b-instant)
 *
 * Usage:
 *   node --env-file=.env node_modules/.bin/tsx scripts/build-raptor-index.ts
 *
 * Idempotent: deletes existing raptor_summary rows for updated sources before reinserting.
 * Safe to re-run after adding new knowledge files.
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

// ─── Env ─────────────────────────────────────────────────────────────────────

const JINA_KEY     = process.env.VITE_JINA_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
const GROQ_KEY     = process.env.VITE_GROQ_API_KEY;

if (!JINA_KEY)     { console.error('❌ VITE_JINA_API_KEY is not set'); process.exit(1); }
if (!SUPABASE_URL) { console.error('❌ VITE_SUPABASE_URL is not set');  process.exit(1); }
if (!SUPABASE_KEY) { console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set'); process.exit(1); }
if (!GROQ_KEY)     { console.error('❌ VITE_GROQ_API_KEY is not set — required for summary generation'); process.exit(1); }

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const __filename = fileURLToPath(import.meta.url);
void __filename; // used for dirname only

// ─── Constants ────────────────────────────────────────────────────────────────

const GROQ_URL    = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL  = 'llama-3.1-8b-instant';
const JINA_EMBED  = 'https://api.jina.ai/v1/embeddings';

// Target cluster size: group every N raw chunks from the same source into one summary
const CLUSTER_SIZE = 6;
// Base delay between Groq calls — conservative for 6k TPM free tier
const GROQ_DELAY_MS = 11_000;  // ~5 calls/minute well under 6k TPM
// Max retries on 429 before giving up on a node
const MAX_RETRIES = 3;

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawChunkRow {
  chunk_id:   string;
  content:    string;
  source:     string;
  categories: string[] | null;
  keywords:   string[] | null;
}

interface RaptorRow {
  chunk_id:          string;
  content:           string;
  source:            string;
  categories:        string[];
  keywords:          string[];
  embedding:         number[];
  chunk_type:        'raptor_summary';
  raptor_level:      number;
  raptor_source_ids: string[];
}

// ─── Groq summary generation ─────────────────────────────────────────────────

async function generateClusterSummary(
  chunks: RawChunkRow[],
  level: number,
): Promise<string> {
  const combinedContent = chunks
    .map(c => c.content.trim())
    .join('\n\n---\n\n');

  const systemPrompt = level === 1
    ? `You are a knowledge synthesizer. Given several related text passages from a behavioral science or habit coaching knowledge base, write a concise 120-180 word summary that:
1. Captures the core insight shared across all passages
2. Names the key theory, researcher, or framework referenced
3. Highlights the most actionable finding for habit coaching
4. Uses third-person, encyclopedic tone
Return only the summary — no preamble, no labels.`
    : `You are a knowledge synthesizer. Given several related summaries from the same knowledge domain, write a 150-200 word document-level synthesis that:
1. Identifies the unifying theme across all summaries
2. Extracts the top 2-3 most important research-backed insights
3. Notes how these insights connect to habit formation and behavior change coaching
4. Ends with a one-sentence "key takeaway" for a coach
Return only the synthesis — no preamble, no labels.`;

  const userPrompt = level === 1
    ? `Summarize these related passages:\n\n${combinedContent}`
    : `Synthesize these related summaries into a document-level overview:\n\n${combinedContent}`;

  const body = JSON.stringify({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt   },
    ],
    max_tokens:  300,
    temperature: 0.2,
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`,
      },
      body,
    });

    if (res.ok) {
      const json = await res.json() as { choices: Array<{ message: { content: string } }> };
      return json.choices[0]?.message?.content?.trim() ?? combinedContent.slice(0, 200);
    }

    const errText = await res.text();

    if (res.status === 429) {
      // Parse "Please try again in Xs" from the Groq error message
      const secondsMatch = errText.match(/try again in ([\d.]+)s/);
      const msMatch      = errText.match(/try again in ([\d.]+)ms/);
      let waitMs = GROQ_DELAY_MS; // fallback
      if (secondsMatch) waitMs = Math.ceil(parseFloat(secondsMatch[1]) * 1000) + 1000;
      else if (msMatch) waitMs = Math.ceil(parseFloat(msMatch[1])) + 500;

      if (attempt < MAX_RETRIES) {
        process.stdout.write(`       ⏳ rate limited — waiting ${(waitMs / 1000).toFixed(1)}s (attempt ${attempt}/${MAX_RETRIES})...\r`);
        await sleep(waitMs);
        continue;
      }
    }

    throw new Error(`Groq error ${res.status}: ${errText}`);
  }

  // Should not reach here, but TypeScript needs a return
  throw new Error('Groq: max retries exceeded');
}

// ─── Jina embedding ──────────────────────────────────────────────────────────

async function embedText(text: string): Promise<number[]> {
  const res = await fetch(JINA_EMBED, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${JINA_KEY}`,
    },
    body: JSON.stringify({
      model: 'jina-embeddings-v3',
      task:  'retrieval.passage',
      input: [{ text }],
      dimensions: 1024,
    }),
  });

  if (!res.ok) throw new Error(`Jina embed error ${res.status}: ${await res.text()}`);
  const json = await res.json() as { data: Array<{ embedding: number[] }> };
  return json.data[0]?.embedding ?? [];
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌲 RAPTOR Index Builder\n');

  // 1. Fetch all raw chunks
  console.log('📥  Loading raw knowledge_chunks...');
  const { data: rawRows, error: fetchErr } = await supabase
    .from('knowledge_chunks')
    .select('chunk_id, content, source, categories, keywords')
    .eq('chunk_type', 'raw')
    .not('embedding', 'is', null);

  if (fetchErr || !rawRows) {
    console.error('❌ Failed to fetch knowledge_chunks:', fetchErr?.message);
    process.exit(1);
  }

  const rows = rawRows as RawChunkRow[];
  console.log(`   Found ${rows.length} raw chunks.\n`);

  // 2. Group by source
  const bySource = new Map<string, RawChunkRow[]>();
  for (const row of rows) {
    const src = row.source ?? 'unknown';
    if (!bySource.has(src)) bySource.set(src, []);
    bySource.get(src)!.push(row);
  }

  console.log(`📚  Sources: ${bySource.size}`);
  for (const [src, chunks] of bySource) {
    console.log(`      ${src}: ${chunks.length} chunks`);
  }
  console.log();

  // 3. Load existing RAPTOR chunk_ids — skip nodes that already succeeded
  console.log('🔍  Checking for existing raptor_summary nodes...');
  const { data: existingRaptor } = await supabase
    .from('knowledge_chunks')
    .select('chunk_id, raptor_level')
    .eq('chunk_type', 'raptor_summary');

  const existingIds = new Set<string>(
    (existingRaptor ?? []).map((r: { chunk_id: string }) => r.chunk_id)
  );
  const existingL1 = (existingRaptor ?? []).filter((r: { raptor_level: number }) => r.raptor_level === 1).length;
  const existingL2 = (existingRaptor ?? []).filter((r: { raptor_level: number }) => r.raptor_level === 2).length;
  console.log(`   Found ${existingIds.size} existing nodes (L1: ${existingL1}, L2: ${existingL2}) — will skip these.\n`);

  const level1Rows: RaptorRow[] = [];

  // 4. Level 1 — cluster each source, skip nodes that already exist
  console.log(`\n🔧  Building Level 1 summaries (cluster_size=${CLUSTER_SIZE}, delay=${GROQ_DELAY_MS / 1000}s)...\n`);

  // Also load content of existing L1 nodes so L2 can build from them
  const { data: existingL1Data } = await supabase
    .from('knowledge_chunks')
    .select('chunk_id, content, source, categories, keywords')
    .eq('chunk_type', 'raptor_summary')
    .eq('raptor_level', 1);

  // Seed level1Rows with already-built nodes (no embedding needed — just for L2 grouping)
  for (const row of (existingL1Data ?? [])) {
    level1Rows.push({
      chunk_id:          row.chunk_id,
      content:           row.content,
      source:            row.source,
      categories:        row.categories ?? [],
      keywords:          row.keywords   ?? [],
      embedding:         [],   // not needed for L2 grouping
      chunk_type:        'raptor_summary',
      raptor_level:      1,
      raptor_source_ids: [],
    });
  }
  if (existingL1Data?.length) {
    console.log(`   ↩  Loaded ${existingL1Data.length} existing L1 nodes for L2 building.\n`);
  }

  let groqCallCount = 0;

  for (const [source, chunks] of bySource) {
    const clusters: RawChunkRow[][] = [];
    for (let i = 0; i < chunks.length; i += CLUSTER_SIZE) {
      clusters.push(chunks.slice(i, i + CLUSTER_SIZE));
    }

    let sourceNewCount = 0;
    let sourceSkipCount = 0;
    for (let ci = 0; ci < clusters.length; ci++) {
      const chunkId = `raptor_l1_${source.replace(/[^a-z0-9]/gi, '_')}_c${ci + 1}`;
      if (existingIds.has(chunkId)) { sourceSkipCount++; continue; }
      sourceNewCount++;
    }
    if (sourceSkipCount === clusters.length) {
      console.log(`  ⏭   ${source} — all ${clusters.length} cluster(s) already built`);
      continue;
    }
    console.log(`  📄  ${source} → ${clusters.length} cluster(s) (${sourceSkipCount} skip, ${sourceNewCount} new)`);

    for (let ci = 0; ci < clusters.length; ci++) {
      const cluster      = clusters[ci];
      const chunkId      = `raptor_l1_${source.replace(/[^a-z0-9]/gi, '_')}_c${ci + 1}`;
      const clusterLabel = `${source} [cluster ${ci + 1}/${clusters.length}]`;

      // Skip nodes that already succeeded on a previous run
      if (existingIds.has(chunkId)) {
        process.stdout.write(`     ⏭ skipped ${clusterLabel}\n`);
        continue;
      }

      // Respect rate limit — sleep BEFORE the Groq call (except first)
      if (groqCallCount > 0) await sleep(GROQ_DELAY_MS);
      groqCallCount++;

      try {
        const summary   = await generateClusterSummary(cluster, 1);
        const embedding = await embedText(summary);

        const allCategories = [...new Set(cluster.flatMap(c => c.categories ?? []))];
        const allKeywords   = [...new Set(cluster.flatMap(c => c.keywords   ?? []))];

        const newRow: RaptorRow = {
          chunk_id:          chunkId,
          content:           summary,
          source:            `${source} (summary)`,
          categories:        allCategories,
          keywords:          allKeywords,
          embedding,
          chunk_type:        'raptor_summary',
          raptor_level:      1,
          raptor_source_ids: cluster.map(c => c.chunk_id),
        };

        // Upsert immediately so a crash mid-run doesn't lose progress
        const { error: upsertErr } = await supabase
          .from('knowledge_chunks')
          .upsert(newRow, { onConflict: 'chunk_id' });
        if (upsertErr) throw new Error(`Supabase upsert: ${upsertErr.message}`);

        level1Rows.push(newRow);
        existingIds.add(chunkId); // prevent duplicate in same run
        process.stdout.write(`     ✓ ${clusterLabel}\n`);
      } catch (err) {
        console.error(`     ✗ ${clusterLabel}: ${(err as Error).message}`);
      }
    }
  }

  const newL1Count = level1Rows.length - (existingL1Data?.length ?? 0);
  console.log(`\n   L1 complete: ${existingL1Data?.length ?? 0} existing + ${newL1Count} new = ${level1Rows.length} total`);

  // 6. Level 2 — group ALL level-1 summaries by domain, generate doc summaries
  console.log('\n🔧  Building Level 2 summaries (document-level)...\n');

  const domainGroups = new Map<string, RaptorRow[]>();
  for (const l1 of level1Rows) {
    const domain = l1.categories[0] ?? 'general';
    if (!domainGroups.has(domain)) domainGroups.set(domain, []);
    domainGroups.get(domain)!.push(l1);
  }

  const level2Rows: RaptorRow[] = [];

  for (const [domain, summaries] of domainGroups) {
    if (summaries.length < 2) continue; // skip singleton domains

    const l2clusters: RaptorRow[][] = [];
    for (let i = 0; i < summaries.length; i += 4) {
      l2clusters.push(summaries.slice(i, i + 4));
    }

    for (let ci = 0; ci < l2clusters.length; ci++) {
      const chunkId = `raptor_l2_${domain.replace(/[^a-z0-9]/gi, '_')}_c${ci + 1}`;
      const label   = `${domain} [L2 cluster ${ci + 1}/${l2clusters.length}]`;

      // Skip L2 nodes that already exist
      if (existingIds.has(chunkId)) {
        process.stdout.write(`  ⏭ skipped ${label}\n`);
        level2Rows.push({ chunk_id: chunkId } as RaptorRow); // count only
        continue;
      }

      const cluster = l2clusters[ci];

      // Sleep before each Groq call
      if (groqCallCount > 0) await sleep(GROQ_DELAY_MS);
      groqCallCount++;

      try {
        const pseudoRows: RawChunkRow[] = cluster.map(r => ({
          chunk_id:   r.chunk_id,
          content:    r.content,
          source:     r.source,
          categories: r.categories,
          keywords:   r.keywords,
        }));

        const summary       = await generateClusterSummary(pseudoRows, 2);
        const embedding     = await embedText(summary);
        const allCategories = [...new Set(cluster.flatMap(c => c.categories))];
        const allKeywords   = [...new Set(cluster.flatMap(c => c.keywords))];

        const newRow: RaptorRow = {
          chunk_id:          chunkId,
          content:           summary,
          source:            `${domain} knowledge (document summary)`,
          categories:        allCategories,
          keywords:          allKeywords,
          embedding,
          chunk_type:        'raptor_summary',
          raptor_level:      2,
          raptor_source_ids: cluster.map(c => c.chunk_id),
        };

        const { error: upsertErr } = await supabase
          .from('knowledge_chunks')
          .upsert(newRow, { onConflict: 'chunk_id' });
        if (upsertErr) throw new Error(`Supabase upsert: ${upsertErr.message}`);

        level2Rows.push(newRow);
        existingIds.add(chunkId);
        process.stdout.write(`  ✓ ${label}\n`);
      } catch (err) {
        console.error(`  ✗ ${label}: ${(err as Error).message}`);
      }
    }
  }

  // Count only real rows (skip stubs used for L2 grouping)
  const l1Total = level1Rows.filter(r => r.embedding.length > 0 || existingIds.has(r.chunk_id)).length;
  const l2Total = level2Rows.filter(r => r.embedding?.length > 0 || existingIds.has(r.chunk_id)).length;
  console.log(`\n✅  RAPTOR index: ${l1Total} L1 + ${l2Total} L2 = ${l1Total + l2Total} total summary nodes\n`);
  console.log('   These nodes are embedded and stored alongside raw chunks.');
  console.log('   Enable USE_RAPTOR_INDEX=true in feature-flags to activate during retrieval.\n');
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
