/**
 * One-time migration: embed resourceLibrary.ts entries and upsert to `resources` table.
 *
 * Run with: npx tsx scripts/ingest-resources.ts
 *
 * Prerequisites:
 *   - Local Supabase running (npx supabase start)
 *   - VITE_JINA_API_KEY set in .env.local
 *   - Migration 20260402000004_resources.sql applied (npx supabase db reset)
 *
 * Safe to run multiple times — upserts on (title, url) conflict key.
 * Batches of 5 to stay within Jina rate limits.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { RESOURCE_LIBRARY } from '../src/lib/resourceLibrary';
import type { ResourceLink, GoalResources } from '../src/lib/resourceLibrary';

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';
// Use service role key to bypass RLS on write; fall back to anon key for local dev
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';
const JINA_KEY     = process.env.VITE_JINA_API_KEY ?? '';

if (!JINA_KEY) {
  console.error('❌ VITE_JINA_API_KEY not set — cannot embed resources');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Domain mapping ───────────────────────────────────────────────────────────

const LIBRARY_KEY_TO_DOMAIN: Record<string, string> = {
  guitar:       'Creative',
  boxing:       'Kinesthetic',
  coding:       'Cognitive',
  fitness:      'Health',
  exam:         'Cognitive',
  meditation:   'Health',
  language:     'Cognitive',
  drawing:      'Creative',
  photography:  'Creative',
  cooking:      'Lifestyle',
  writing:      'Creative',
  speaking:     'Career',
  investing:    'Financial',
  running:      'Health',
  yoga:         'Health',
  reading:      'Cognitive',
  chess:        'Cognitive',
  piano:        'Creative',
  dance:        'Kinesthetic',
  productivity: 'Lifestyle',
  swimming:     'Health',
  nutrition:    'Health',
};

// ─── Embedding ────────────────────────────────────────────────────────────────

async function embedText(text: string): Promise<number[]> {
  const res = await fetch('https://api.jina.ai/v1/embeddings', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${JINA_KEY}`,
    },
    body: JSON.stringify({
      model:           'jina-embeddings-v3',
      task:            'retrieval.passage',
      input:           [text],
      dimensions:      1024,
      late_chunking:   false,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jina embed failed: ${res.status} ${err}`);
  }
  const json = await res.json() as { data: Array<{ embedding: number[] }> };
  return json.data[0]?.embedding ?? [];
}

// ─── Collect all resources ────────────────────────────────────────────────────

interface IngestRow {
  title:            string;
  url:              string;
  type:             string;
  domain:           string;
  sub_domain:       string;
  tags:             string[];
  difficulty_level: string;
  description:      string;
  why_useful:       string;
  duration_minutes: number | null;
}

function collectRows(): IngestRow[] {
  const rows: IngestRow[] = [];
  const seen = new Set<string>();

  for (const [libraryKey, goalRes] of Object.entries(RESOURCE_LIBRARY as Record<string, GoalResources>)) {
    const domain = LIBRARY_KEY_TO_DOMAIN[libraryKey] ?? 'Lifestyle';

    for (const [topicKey, topicResources] of Object.entries(goalRes.keyResources)) {
      for (const r of topicResources as ResourceLink[]) {
        const dedupeKey = `${r.url}|${r.title}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        rows.push({
          title:            r.title,
          url:              r.url,
          type:             r.type,
          domain,
          sub_domain:       libraryKey,
          tags:             [...(r.topics ?? []), topicKey],
          difficulty_level: r.skillLevel ?? 'all',
          description:      r.description,
          why_useful:       r.why,
          duration_minutes: parseDuration(r.duration),
        });
      }
    }
  }

  return rows;
}

function parseDuration(duration?: string): number | null {
  if (!duration) return null;
  const parts = duration.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  const mins = parseInt(duration);
  return isNaN(mins) ? null : mins;
}

// ─── Ingest ───────────────────────────────────────────────────────────────────

async function ingest(): Promise<void> {
  const rows = collectRows();
  console.log(`📚 Found ${rows.length} resources to ingest`);

  let inserted = 0;
  let failed = 0;

  // Process sequentially (batch of 1) — Jina free tier allows only 2 concurrent requests
  for (let i = 0; i < rows.length; i += 1) {
    const batch = rows.slice(i, i + 1);

    await Promise.all(batch.map(async (row) => {
      try {
        const text = `${row.title} ${row.description} ${row.domain} ${row.sub_domain} ${row.tags.join(' ')}`;
        const embedding = await embedText(text);

        const { error } = await supabase
          .from('resources')
          .upsert(
            { ...row, embedding },
            { onConflict: 'title,url', ignoreDuplicates: false }
          );

        if (error) {
          console.error(`  ❌ Failed: "${row.title}" — ${error.message}`);
          failed++;
        } else {
          inserted++;
        }
      } catch (err) {
        console.error(`  ❌ Embed failed: "${row.title}" — ${err}`);
        failed++;
      }
    }));

    // Progress report every 10
    if ((i + 1) % 10 === 0) {
      console.log(`  ✓ ${i + 1}/${rows.length} processed (${inserted} inserted, ${failed} failed)`);
    }

    // Brief rate-limit pause between requests
    if (i + 1 < rows.length) {
      await new Promise(r => setTimeout(r, 150));
    }
  }

  console.log(`\n✅ Ingest complete: ${inserted} inserted, ${failed} failed out of ${rows.length} total`);
}

ingest().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
