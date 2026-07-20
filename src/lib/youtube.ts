/**
 * Shared YouTube helpers — one definition of "is this an embeddable video?"
 * used by ResourceCard, resourceRetriever, and task-generator so the
 * "video shows" guarantee can't drift between producer and renderer.
 */

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
