/**
 * scripts/dump-seed.ts
 *
 * Generates supabase/seed.sql from the current local database.
 * Uses the service role key so RLS doesn't block the read.
 * Produces clean INSERT statements — no pg_dump metacommands.
 *
 * Run after ingest scripts have populated the tables:
 *   npm run db:seed-dump
 *
 * Then commit supabase/seed.sql. After every future `supabase db reset`,
 * Supabase auto-runs seed.sql — no ingest scripts needed.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── SQL escaping ──────────────────────────────────────────────────────────────

function sqlStr(v: string | null | undefined): string {
  if (v === null || v === undefined) return 'NULL';
  return `'${v.replace(/'/g, "''")}'`;
}

function sqlArr(v: string[] | null | undefined): string {
  if (!v || v.length === 0) return "ARRAY[]::text[]";
  const escaped = v.map(s => `'${s.replace(/'/g, "''")}'`).join(',');
  return `ARRAY[${escaped}]`;
}

function sqlNum(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'NULL';
  return String(v);
}

function sqlVec(v: string | number[] | null | undefined): string {
  if (!v) return 'NULL';
  // Supabase returns vectors as strings like "[0.1,0.2,...]"
  const str = Array.isArray(v) ? `[${v.join(',')}]` : String(v);
  return `'${str}'::vector`;
}

// ── Dump knowledge_chunks ─────────────────────────────────────────────────────

async function dumpKnowledgeChunks(): Promise<string[]> {
  console.log('📚 Fetching knowledge_chunks...');
  const lines: string[] = [];
  let offset = 0;
  const pageSize = 50;

  while (true) {
    const { data, error } = await supabase
      .from('knowledge_chunks')
      .select('*')
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`knowledge_chunks fetch failed: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data) {
      lines.push(
        `INSERT INTO knowledge_chunks ` +
        `(id, chunk_id, content, source, categories, keywords, embedding, enriched_content, framework, content_type, applicable_stones, coaching_stage, evidence_level, emotion_context, chunk_type, raptor_level, raptor_source_ids, created_at) VALUES (` +
        `${sqlStr(row.id)},` +
        `${sqlStr(row.chunk_id)},` +
        `${sqlStr(row.content)},` +
        `${sqlStr(row.source)},` +
        `${sqlArr(row.categories)},` +
        `${sqlArr(row.keywords)},` +
        `${sqlVec(row.embedding)},` +
        `${sqlStr(row.enriched_content)},` +
        `${sqlStr(row.framework)},` +
        `${sqlStr(row.content_type)},` +
        `${sqlArr(row.applicable_stones)},` +
        `${sqlStr(row.coaching_stage)},` +
        `${sqlStr(row.evidence_level)},` +
        `${sqlArr(row.emotion_context)},` +
        `${sqlStr(row.chunk_type)},` +
        `${sqlNum(row.raptor_level)},` +
        `${row.raptor_source_ids ? sqlArr(row.raptor_source_ids) : 'NULL'},` +
        `${sqlStr(row.created_at)}` +
        `) ON CONFLICT (chunk_id) DO NOTHING;`
      );
    }

    offset += data.length;
    console.log(`  ✓ ${offset} rows fetched`);
    if (data.length < pageSize) break;
  }

  return lines;
}

// ── Dump resources ────────────────────────────────────────────────────────────

async function dumpResources(): Promise<string[]> {
  console.log('🎬 Fetching resources...');
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`resources fetch failed: ${error.message}`);
  if (!data) return [];

  return data.map(row =>
    `INSERT INTO resources ` +
    `(id, title, url, type, domain, sub_domain, tags, difficulty_level, description, why_useful, duration_minutes, embedding, created_at) VALUES (` +
    `${sqlStr(row.id)},` +
    `${sqlStr(row.title)},` +
    `${sqlStr(row.url)},` +
    `${sqlStr(row.type)},` +
    `${sqlStr(row.domain)},` +
    `${sqlStr(row.sub_domain)},` +
    `${sqlArr(row.tags)},` +
    `${sqlStr(row.difficulty_level)},` +
    `${sqlStr(row.description)},` +
    `${sqlStr(row.why_useful)},` +
    `${sqlNum(row.duration_minutes)},` +
    `${sqlVec(row.embedding)},` +
    `${sqlStr(row.created_at)}` +
    `) ON CONFLICT (title, url) DO NOTHING;`
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const [kcLines, resLines] = await Promise.all([
    dumpKnowledgeChunks(),
    dumpResources(),
  ]);

  const output = [
    `-- Auto-generated knowledge base seed.`,
    `-- Regenerate with: npm run db:seed-dump`,
    `-- knowledge_chunks: ${kcLines.length} rows | resources: ${resLines.length} rows`,
    ``,
    `-- knowledge_chunks`,
    ...kcLines,
    ``,
    `-- resources`,
    ...resLines,
    ``,
  ].join('\n');

  const outPath = join(__dirname, '..', 'supabase', 'seed.sql');
  writeFileSync(outPath, output, 'utf8');

  console.log(`\n✅ seed.sql written:`);
  console.log(`   knowledge_chunks: ${kcLines.length} rows`);
  console.log(`   resources:        ${resLines.length} rows`);
  console.log(`   file: supabase/seed.sql`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
