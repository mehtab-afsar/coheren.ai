#!/usr/bin/env tsx
/**
 * Coheren Knowledge Ingestion Script
 *
 * Reads all .md and .txt files from src/knowledge/frameworks/ and
 * src/knowledge/domain-specific/, chunks them by ## headings,
 * generates Jina AI v3 embeddings, and upserts into Supabase knowledge_chunks.
 *
 * Idempotent: upserts on chunk_id, so re-running is safe.
 *
 * Requirements (.env):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← from Supabase dashboard → Settings → API
 *   VITE_JINA_API_KEY           ← free at https://jina.ai
 *
 * Run: npx tsx scripts/ingest-knowledge.ts
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, basename, extname } from 'path';
import { createClient } from '@supabase/supabase-js';

// ─── .env loader (no dotenv dependency) ──────────────────────────────────────

function loadEnv(): Record<string, string> {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
    const env: Record<string, string> = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      env[key] = val;
    }
    return env;
  } catch {
    return {};
  }
}

const env = loadEnv();
const SUPABASE_URL  = env.VITE_SUPABASE_URL          ?? process.env.VITE_SUPABASE_URL ?? '';
const SERVICE_KEY   = env.SUPABASE_SERVICE_ROLE_KEY  ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const JINA_API_KEY  = env.VITE_JINA_API_KEY          ?? process.env.VITE_JINA_API_KEY ?? '';

if (!SUPABASE_URL || !SERVICE_KEY || !JINA_API_KEY) {
  console.error('\n❌  Missing required environment variables:');
  if (!SUPABASE_URL)  console.error('   • VITE_SUPABASE_URL');
  if (!SERVICE_KEY)   console.error('   • SUPABASE_SERVICE_ROLE_KEY  (Supabase dashboard → Settings → API)');
  if (!JINA_API_KEY)  console.error('   • VITE_JINA_API_KEY          (free at https://jina.ai)');
  process.exit(1);
}

// ─── Supabase service-role client (bypasses RLS for upsert) ──────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface Chunk {
  chunk_id:   string;
  content:    string;
  source:     string;
  categories: string[];
  keywords:   string[];
}

interface ChunkWithEmbedding extends Chunk {
  embedding: number[];
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

function toTitleCase(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Recursively collect all .md and .txt files under a directory */
function collectFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...collectFiles(fullPath));
    } else if (['.md', '.txt'].includes(extname(entry))) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Chunk a markdown file by ## headings.
 * Each section (## Heading + body) becomes one chunk.
 * chunk_id = "<filename-slug>_<heading-slug>" — stable and unique.
 */
function chunkMarkdown(filepath: string): Chunk[] {
  const filename = basename(filepath).replace(/\.(md|txt)$/, '');
  const fileSlug = slugify(filename);

  // Derive source title from the first # heading, or fallback to filename
  const raw = readFileSync(filepath, 'utf-8');
  const titleMatch = raw.match(/^#\s+(.+)$/m);
  const sourceTitle = titleMatch ? titleMatch[1].trim() : toTitleCase(filename);

  const lines = raw.split('\n');
  const chunks: Chunk[] = [];

  let currentHeading = filename;
  let buffer: string[] = [];

  const flush = () => {
    const body = buffer.join('\n').trim();
    // Skip trivially short sections (likely just whitespace or a single word)
    if (body.length < 60) {
      buffer = [];
      return;
    }
    // Trim to 800 chars at sentence boundary to stay within Jina's sweet spot
    let content = body.length > 800
      ? body.slice(0, 800).replace(/\s+\S*$/, '') + '…'
      : body;
    // Prepend heading for context
    content = `${currentHeading}\n${content}`;

    chunks.push({
      chunk_id:   `${fileSlug}_${slugify(currentHeading)}`,
      content,
      source:     sourceTitle,
      categories: [],
      keywords:   [],
    });
    buffer = [];
  };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flush();
      currentHeading = line.replace(/^##\s+/, '').trim();
    } else if (!line.startsWith('# ')) {
      // Skip the top-level # title line — it's included in sourceTitle already
      buffer.push(line);
    }
  }
  flush(); // Final section

  return chunks;
}

// ─── Jina AI batch embedding ──────────────────────────────────────────────────

const JINA_BATCH_SIZE = 20; // Stay well within Jina rate limits

async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await fetch('https://api.jina.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${JINA_API_KEY}`,
    },
    body: JSON.stringify({
      model:      'jina-embeddings-v3',
      input:      texts,
      task:       'retrieval.passage',  // MUST be passage for documents, not query
      dimensions: 1024,
      normalized: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Jina API error ${response.status}: ${body}`);
  }

  const data = await response.json() as {
    data: Array<{ embedding: number[]; index: number }>;
    usage: { total_tokens: number };
  };

  console.log(`  Tokens used: ${data.usage.total_tokens}`);
  return data.data
    .sort((a, b) => a.index - b.index)
    .map(d => d.embedding);
}

async function embedAllChunks(chunks: Chunk[]): Promise<ChunkWithEmbedding[]> {
  const result: ChunkWithEmbedding[] = [];

  for (let i = 0; i < chunks.length; i += JINA_BATCH_SIZE) {
    const batch = chunks.slice(i, i + JINA_BATCH_SIZE);
    process.stdout.write(`  Embedding batch ${Math.floor(i / JINA_BATCH_SIZE) + 1}/${Math.ceil(chunks.length / JINA_BATCH_SIZE)}...`);

    const embeddings = await embedBatch(batch.map(c => c.content));
    for (let j = 0; j < batch.length; j++) {
      result.push({ ...batch[j], embedding: embeddings[j] });
    }
  }

  return result;
}

// ─── Supabase upsert ──────────────────────────────────────────────────────────

async function upsertChunks(chunks: ChunkWithEmbedding[]): Promise<void> {
  const UPSERT_BATCH = 50;
  for (let i = 0; i < chunks.length; i += UPSERT_BATCH) {
    const batch = chunks.slice(i, i + UPSERT_BATCH);
    const { error } = await supabase
      .from('knowledge_chunks')
      .upsert(batch, { onConflict: 'chunk_id' });

    if (error) {
      throw new Error(`Supabase upsert error: ${error.message}`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const knowledgeRoot = resolve(process.cwd(), 'src/knowledge');
  console.log('\n════════════════════════════════════════════════════');
  console.log(' COHEREN — Knowledge Ingestion Pipeline');
  console.log('════════════════════════════════════════════════════\n');

  // Collect all files
  let files: string[];
  try {
    files = collectFiles(knowledgeRoot).filter(f => !f.includes('README'));
  } catch {
    console.error(`❌  Knowledge directory not found: ${knowledgeRoot}`);
    console.error('   Create src/knowledge/frameworks/ and add .md files.');
    process.exit(1);
  }

  if (files.length === 0) {
    console.log('⚠  No .md or .txt files found under src/knowledge/');
    console.log('   Add knowledge files and re-run.');
    process.exit(0);
  }

  console.log(`Found ${files.length} files:\n`);

  // Chunk all files
  const allChunks: Chunk[] = [];
  for (const file of files) {
    const relPath = file.replace(process.cwd() + '/', '');
    const chunks  = chunkMarkdown(file);
    console.log(`  ${relPath.padEnd(55)} → ${chunks.length} chunks`);
    allChunks.push(...chunks);
  }

  // Deduplicate by chunk_id (in case of overlapping filenames)
  const deduped = [...new Map(allChunks.map(c => [c.chunk_id, c])).values()];
  console.log(`\nTotal chunks: ${deduped.length} (${allChunks.length - deduped.length} duplicates removed)\n`);

  // Generate embeddings
  console.log('Generating Jina AI v3 embeddings (task=retrieval.passage)...\n');
  let chunksWithEmbeddings: ChunkWithEmbedding[];
  try {
    chunksWithEmbeddings = await embedAllChunks(deduped);
  } catch (err) {
    console.error(`\n❌  Embedding failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  // Upsert to Supabase
  console.log(`\nUpserting ${chunksWithEmbeddings.length} chunks to Supabase...\n`);
  try {
    await upsertChunks(chunksWithEmbeddings);
  } catch (err) {
    console.error(`❌  ${err instanceof Error ? err.message : String(err)}`);
    console.error('\n   Possible causes:');
    console.error('   • Migration not applied — run: npx supabase db reset');
    console.error('   • Service role key incorrect');
    process.exit(1);
  }

  console.log('════════════════════════════════════════════════════');
  console.log(` ✓  ${chunksWithEmbeddings.length} chunks ingested successfully`);
  console.log('════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
