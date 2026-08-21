/**
 * Shared YouTube helpers — one definition of "is this an embeddable video?"
 * used by ResourceCard, resourceRetriever, and task-generator so the
 * "video shows" guarantee can't drift between producer and renderer.
 */

import { env } from '@config/env';
import { proxyFetch } from './ai-proxy-fetch';

/** Extract an 11-char YouTube video ID, or null if the URL isn't a watchable video. */
export function getYouTubeId(url: string | undefined | null): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

/** True when the URL embeds directly as a YouTube player (not a search/results link). */
export function isEmbeddableVideoUrl(url: string | undefined | null): boolean {
  return getYouTubeId(url) !== null;
}

/**
 * Find the first embeddable YouTube link inside a free-text string (e.g. a task
 * step like "Watch https://youtu.be/abc123DEFGH at 2x speed"). Returns the video
 * id and the exact matched substring (so callers can strip it from display text),
 * or null if the text has no watchable YouTube URL. ID validation delegates to
 * getYouTubeId so there is a single definition of "valid YouTube URL".
 */
export function extractYouTubeFromText(
  text: string | undefined | null,
): { id: string; match: string } | null {
  if (!text) return null;
  const tokens = text.match(/https?:\/\/[^\s]+/g);
  if (!tokens) return null;
  for (const token of tokens) {
    // Strip trailing sentence punctuation the URL token may have swallowed.
    const trimmed = token.replace(/[.,'")\]}]+$/, '');
    const id = getYouTubeId(trimmed);
    if (id) return { id, match: token };
  }
  return null;
}

/** Detect the YouTube search-result URLs produced by the resource sanitizer. */
export function isYouTubeSearchUrl(url: string | undefined | null): boolean {
  return !!url && url.includes('youtube.com/results?search_query=');
}

/** Human-readable query from a YouTube search URL. */
export function extractYouTubeSearchQuery(url: string): string {
  try {
    const q = new URL(url).searchParams.get('search_query') ?? '';
    return decodeURIComponent(q).replace(/\+/g, ' ');
  } catch {
    return '';
  }
}

/** Convert "H:MM:SS" or "M:SS" to total seconds. */
export function timeToSeconds(t: string | undefined | null): number {
  if (!t) return 0;
  const parts = t.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(parts[0]) || 0;
}

/** Format whole minutes as "M:SS" (e.g. 7 → "7:00"). */
export function minutesToTimestamp(min: number): string {
  const m = Math.max(0, Math.floor(min));
  return `${m}:00`;
}

// ─── Live existence verification ───────────────────────────────────────────────
// isEmbeddableVideoUrl above is a URL-*shape* check only — it says nothing about
// whether the video still exists. verifyYouTubeVideoLive does a real check via
// YouTube's keyless oEmbed endpoint, routed through the ai-proxy edge function
// (consistent with this app's "no raw third-party calls from the client" pattern,
// and avoids relying on unconfirmed browser CORS behavior for oEmbed).

const OEMBED_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week — only for a *confirmed* result
const OEMBED_TIMEOUT_MS = 8000;
const oembedCache = new Map<string, { live: boolean; checkedAt: number }>();

/**
 * Verify a YouTube video is still live/public via oEmbed. Returns false for any
 * non-video URL, a deleted/private video, or a network/proxy failure — callers
 * should treat "unverified" the same as "don't show this as a confirmed resource."
 *
 * Only a *confirmed* answer gets cached for OEMBED_CACHE_TTL_MS: a 2xx (live) or
 * a 401/403/404 (oEmbed's own "gone/private" response). A transient failure —
 * network error, timeout, or a 429/5xx (the shared ai-proxy rate limit or an infra
 * blip, not YouTube saying anything about the video) — is deliberately NOT cached,
 * so a brief outage can't hide a genuinely live video from every user for a week.
 */
export async function verifyYouTubeVideoLive(url: string | undefined | null): Promise<boolean> {
  const id = getYouTubeId(url);
  if (!id) return false;

  const cached = oembedCache.get(id);
  if (cached && Date.now() - cached.checkedAt < OEMBED_CACHE_TTL_MS) {
    return cached.live;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OEMBED_TIMEOUT_MS);
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${id}`;
    const oembedUrl = `${env.AI_PROXY_URL}/youtube/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
    const res = await proxyFetch(oembedUrl, { signal: controller.signal });

    if (res.ok) {
      oembedCache.set(id, { live: true, checkedAt: Date.now() });
      return true;
    }
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      oembedCache.set(id, { live: false, checkedAt: Date.now() });
    }
    return false;
  } catch {
    // Network error, timeout, or abort — transient, deliberately not cached.
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
