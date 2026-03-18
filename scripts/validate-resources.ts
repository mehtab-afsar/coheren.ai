#!/usr/bin/env npx tsx
/**
 * Resource URL Validation Script
 *
 * Checks all URLs in the resource library for:
 *   - HTTP status (reachable / 404 / redirect / timeout)
 *   - YouTube video availability (via oEmbed API)
 *   - Duplicate URL detection
 *
 * Usage: npx tsx scripts/validate-resources.ts
 */

import { RESOURCE_LIBRARY, type ResourceLink, type GoalResources } from '../src/lib/resourceLibrary';

const TIMEOUT_MS = 8000;
const CONCURRENCY = 5;

interface ValidationResult {
  url: string;
  title: string;
  category: string;
  section: string;
  status: 'ok' | 'warn' | 'error';
  statusCode?: number;
  message: string;
}

async function checkUrl(url: string): Promise<{ status: number | null; ok: boolean; message: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // For YouTube URLs, use oEmbed API for faster/more reliable check
    if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
      if (videoId) {
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const res = await fetch(oembedUrl, { signal: controller.signal, redirect: 'follow' });
        clearTimeout(timeout);
        if (res.ok) return { status: 200, ok: true, message: 'YouTube video exists' };
        if (res.status === 401 || res.status === 403) return { status: res.status, ok: false, message: 'YouTube video unavailable/private' };
        return { status: res.status, ok: false, message: `YouTube oEmbed returned ${res.status}` };
      }
    }

    // For YouTube playlists, just do a HEAD check
    if (url.includes('youtube.com/playlist')) {
      const res = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
      clearTimeout(timeout);
      return { status: res.status, ok: res.ok, message: res.ok ? 'Playlist reachable' : `HTTP ${res.status}` };
    }

    // General URL check via HEAD, fallback to GET
    let res = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
    if (res.status === 405) {
      // HEAD not allowed, try GET
      res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    }
    clearTimeout(timeout);
    return { status: res.status, ok: res.ok, message: res.ok ? 'Reachable' : `HTTP ${res.status}` };
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === 'AbortError') {
      return { status: null, ok: false, message: `Timeout after ${TIMEOUT_MS}ms` };
    }
    return { status: null, ok: false, message: `Network error: ${(err as Error).message}` };
  }
}

function collectAllResources(): Array<{ url: string; title: string; category: string; section: string }> {
  const all: Array<{ url: string; title: string; category: string; section: string }> = [];

  for (const [category, resources] of Object.entries(RESOURCE_LIBRARY)) {
    const goalRes = resources as GoalResources;

    // Channels
    for (const ch of goalRes.channels) {
      all.push({ url: ch.channelUrl, title: ch.name, category, section: 'channels' });
    }

    // Playlists
    for (const pl of goalRes.playlists) {
      all.push({ url: pl.url, title: pl.title, category, section: 'playlists' });
    }

    // Articles
    for (const art of goalRes.articles) {
      all.push({ url: art.url, title: art.title, category, section: 'articles' });
    }

    // Tools
    for (const tool of goalRes.tools) {
      all.push({ url: tool.url, title: tool.title, category, section: 'tools' });
    }

    // Key resources
    for (const [topic, items] of Object.entries(goalRes.keyResources)) {
      for (const item of items as ResourceLink[]) {
        all.push({ url: item.url, title: item.title, category, section: `keyResources.${topic}` });
      }
    }
  }

  return all;
}

async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
}

async function main() {
  console.log('🔍 Collecting all resource URLs...\n');
  const resources = collectAllResources();

  // Deduplicate check
  const urlCounts = new Map<string, string[]>();
  for (const r of resources) {
    const existing = urlCounts.get(r.url) ?? [];
    existing.push(`${r.category}/${r.section}`);
    urlCounts.set(r.url, existing);
  }
  const duplicates = Array.from(urlCounts.entries()).filter(([, locs]) => locs.length > 1);

  // Deduplicate for validation (check each URL once)
  const uniqueResources = new Map<string, typeof resources[0]>();
  for (const r of resources) {
    if (!uniqueResources.has(r.url)) uniqueResources.set(r.url, r);
  }

  console.log(`Found ${resources.length} total URLs (${uniqueResources.size} unique) across ${Object.keys(RESOURCE_LIBRARY).length} categories\n`);

  if (duplicates.length > 0) {
    console.log(`⚠️  ${duplicates.length} duplicate URLs (shared across categories — expected for aliases):`);
    for (const [url, locs] of duplicates) {
      console.log(`   ${url} → ${locs.join(', ')}`);
    }
    console.log('');
  }

  // Validate each unique URL
  const tasks = Array.from(uniqueResources.values()).map(r => async (): Promise<ValidationResult> => {
    const result = await checkUrl(r.url);
    return {
      url: r.url,
      title: r.title,
      category: r.category,
      section: r.section,
      status: result.ok ? 'ok' : (result.status === null ? 'error' : 'warn'),
      statusCode: result.status ?? undefined,
      message: result.message,
    };
  });

  console.log(`Validating ${tasks.length} URLs (concurrency: ${CONCURRENCY})...\n`);
  const results = await runWithConcurrency(tasks, CONCURRENCY);

  // Report
  const ok = results.filter(r => r.status === 'ok');
  const warns = results.filter(r => r.status === 'warn');
  const errors = results.filter(r => r.status === 'error');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`RESULTS: ${ok.length} ok, ${warns.length} warnings, ${errors.length} errors`);
  console.log(`${'='.repeat(60)}\n`);

  if (warns.length > 0) {
    console.log('⚠️  WARNINGS:');
    for (const w of warns) {
      console.log(`   [${w.category}/${w.section}] "${w.title}"`);
      console.log(`   ${w.url} → ${w.message}`);
    }
    console.log('');
  }

  if (errors.length > 0) {
    console.log('❌ ERRORS:');
    for (const e of errors) {
      console.log(`   [${e.category}/${e.section}] "${e.title}"`);
      console.log(`   ${e.url} → ${e.message}`);
    }
    console.log('');
  }

  if (ok.length === results.length) {
    console.log('✅ All resource URLs are valid!\n');
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

main();
