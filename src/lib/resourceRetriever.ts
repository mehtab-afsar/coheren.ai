/**
 * Semantic Resource Retriever (Change 6 — USE_DYNAMIC_RESOURCES)
 *
 * Queries the `resources` Supabase table by semantic similarity (Jina v3 embeddings).
 * Falls back to getResourcesForGoal() from resourceLibrary.ts when:
 *   - Supabase is unavailable
 *   - The flag USE_DYNAMIC_RESOURCES is off (called at the task-generator level)
 *   - The table is empty / no results above threshold
 *
 * RLS: resources table has a public SELECT policy — no auth required.
 */

import { supabase } from './supabase';
import { embedQuery } from './jina-client';
import { env } from '@config/env';
import { getResourcesForGoal } from './resourceLibrary';
import { timeToSeconds, minutesToTimestamp, isEmbeddableVideoUrl, verifyYouTubeVideoLive } from './youtube';
import type { TaskResource } from '@types-app/agents';
import type { ResourceLink } from './resourceLibrary';

/**
 * The user only has so many minutes to study. The "Learn" portion of a session is
 * ~40% of the daily budget, so cap the watch window to that. Returns a clamped budget.
 */
function watchBudgetFor(dailyMinutes: number): number {
  const raw = Math.round((dailyMinutes || 30) * 0.4);
  return Math.max(5, Math.min(raw, dailyMinutes || 30));
}

/**
 * Attach a crop window sized to the watch budget. If the resource is longer than the
 * budget, set watchFrom/watchTo so ResourceCard plays a brief, sized clip and labels it.
 * `lengthMin` is the resource's full length in minutes (null/0 = unknown).
 */
function withWatchWindow(resource: TaskResource, lengthMin: number | null, watchBudget: number): TaskResource {
  if (!lengthMin || lengthMin <= 0) {
    // Unknown length — still communicate the planned watch time.
    return { ...resource, watchMinutes: watchBudget };
  }
  if (lengthMin > watchBudget) {
    return {
      ...resource,
      watchFrom: '0:00',
      watchTo: minutesToTimestamp(watchBudget),
      watchMinutes: watchBudget,
    };
  }
  // Already short enough — watch the whole thing.
  return { ...resource, watchMinutes: Math.round(lengthMin) };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResourceRetrievalParams {
  taskTitle:         string;
  domain:            string;
  phase:             number;
  stoneTypes:        string[];
  difficultyLevel:   number;   // 1-5 scale matching task difficulty
  durationAvailable: number;   // minutes
  goalText?:         string;
}

interface SupabaseResourceRow {
  id:               string;
  title:            string;
  url:              string;
  type:             string;
  domain:           string;
  sub_domain:       string | null;
  tags:             string[];
  difficulty_level: string | null;
  description:      string;
  why_useful:       string;
  duration_minutes: number | null;
  similarity:       number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIFFICULTY_LABEL: Record<number, string> = {
  1: 'beginner',
  2: 'beginner',
  3: 'intermediate',
  4: 'advanced',
  5: 'advanced',
};

function mapToTaskResource(row: SupabaseResourceRow): TaskResource {
  return {
    type:        row.type as TaskResource['type'],
    title:       row.title,
    url:         row.url,
    platform:    row.sub_domain ?? undefined,
    description: row.description,
    why:         row.why_useful,
    skillLevel:  (row.difficulty_level as TaskResource['skillLevel']) ?? 'all',
    topics:      row.tags,
    duration:    row.duration_minutes != null ? `${row.duration_minutes} min` : undefined,
  };
}

function resourceLinkToTaskResource(r: ResourceLink): TaskResource {
  return {
    type:        r.type,
    title:       r.title,
    url:         r.url,
    platform:    r.platform,
    channel:     r.channel,
    duration:    r.duration,
    thumbnail:   r.thumbnail,
    description: r.description,
    why:         r.why,
    skillLevel:  r.skillLevel,
    topics:      r.topics,
    timestamps:  r.timestamps,
  };
}

/**
 * Verify a list of video candidates concurrently (not sequentially — each check
 * is an independent oEmbed round-trip, so awaiting them one at a time pays up to
 * N× the necessary latency), then return the first one that's confirmed live IN
 * ORIGINAL PRIORITY ORDER (semantic-similarity rank / library order) — not simply
 * whichever check happens to resolve fastest.
 */
async function firstLiveVideo<T>(candidates: T[], getUrl: (c: T) => string): Promise<T | null> {
  const results = await Promise.all(candidates.map(c => verifyYouTubeVideoLive(getUrl(c))));
  const idx = results.findIndex(Boolean);
  return idx === -1 ? null : candidates[idx];
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Retrieve semantically relevant resources for a task.
 *
 * Returns { primary, supplementary } matching TaskResource shape.
 * Falls back to getResourcesForGoal() on any error or empty result.
 */
export async function getResourcesForTask(
  params: ResourceRetrievalParams,
): Promise<{ primary: TaskResource | null; supplementary: TaskResource[] }> {
  try {
    // Build a rich query combining task title + domain + stone context
    const stoneContext = params.stoneTypes.slice(0, 2).join(' ');
    const query = [
      params.taskTitle,
      params.domain,
      params.goalText ? params.goalText.slice(0, 60) : '',
      stoneContext,
    ].filter(Boolean).join(' ');

    // embedQuery routes through the ai-proxy edge function, which holds the real
    // Jina key server-side — the apiKey arg here is vestigial and ignored.
    const embedding = await embedQuery(query, env.JINA_API_KEY);
    if (embedding.length === 0) return staticFallback(params);

    const difficultyLabel = DIFFICULTY_LABEL[Math.round(params.difficultyLevel)] ?? 'beginner';

    const { data, error } = await supabase
      .rpc('match_resources', {
        query_embedding: embedding,
        match_count:     6,
        filter_domain:   params.domain,
        filter_type:     'video',           // prioritise video for Cinema Mode
        max_difficulty:  difficultyLabel,
      })
      .returns<SupabaseResourceRow[]>();

    const rows = Array.isArray(data) ? (data as SupabaseResourceRow[]) : [];
    if (error || rows.length === 0) return staticFallback(params);

    // Filter to resources short enough for the time budget (duration ≤ durationAvailable)
    const fitting = rows.filter(r =>
      r.duration_minutes == null || r.duration_minutes <= params.durationAvailable
    );

    const candidates = fitting.length > 0 ? fitting : rows;
    const watchBudget = watchBudgetFor(params.durationAvailable);
    const mapped = candidates.map(row =>
      withWatchWindow(mapToTaskResource(row), row.duration_minutes, watchBudget)
    );

    // match_resources is queried with filter_type: 'video', so every candidate is
    // a video — verify the top few are still live before trusting one as primary
    // (semantic similarity says nothing about whether the video still exists).
    const primary = await firstLiveVideo(mapped.slice(0, 3), r => r.url);
    if (!primary) return staticFallback(params);

    const rest = mapped.filter(r => r !== primary);
    return {
      primary,
      supplementary: rest.slice(0, 2),
    };
  } catch {
    return staticFallback(params);
  }
}

/**
 * Find a guaranteed-embeddable YouTube video for a goal from the static library,
 * sized to the daily budget. Used as a last resort so the study card always has a
 * real, playable video rather than a dead "Search" link.
 *
 * "Embeddable" here means both URL-shape-valid AND verified live via oEmbed —
 * a hand-curated library still goes stale (videos get deleted/made private), so
 * this checks every video candidate before trusting it, not just its URL shape.
 */
export async function getEmbeddableVideoFallback(goalText: string, dailyMinutes: number): Promise<TaskResource | null> {
  const watchBudget = watchBudgetFor(dailyMinutes);
  const links = getResourcesForGoal(goalText);
  // Cap candidates checked — the library rarely has more than a couple of video
  // entries per topic, and this bounds worst-case oEmbed round-trips per call.
  const candidates = links.filter(l => l.type === 'video' && isEmbeddableVideoUrl(l.url)).slice(0, 3);
  const fitting = await firstLiveVideo(candidates, l => l.url);
  if (fitting) {
    const lengthMin = fitting.duration ? Math.round(timeToSeconds(fitting.duration) / 60) : null;
    return withWatchWindow(resourceLinkToTaskResource(fitting), lengthMin, watchBudget);
  }
  // No curated video for THIS topic (or every candidate failed live verification).
  // Return an honest topic-specific search link
  // (ResourceCard renders it as a "Search YouTube" card) rather than substituting
  // an unrelated evergreen "study" video and pretending it's on-topic.
  const query = goalText.trim();
  if (!query) return null;
  return {
    type: 'video',
    title: `Find a video: ${query}`,
    url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    description: `We don't have a hand-picked video for this one yet — search YouTube for a good "${query}" tutorial.`,
    why: 'A relevant tutorial you choose beats a generic off-topic one.',
  };
}

function staticFallback(
  params: ResourceRetrievalParams,
): { primary: TaskResource | null; supplementary: TaskResource[] } {
  const goalText = params.goalText ?? params.taskTitle;
  const links = getResourcesForGoal(goalText);

  if (links.length === 0) return { primary: null, supplementary: [] };

  const watchBudget = watchBudgetFor(params.durationAvailable);
  const [first, ...rest] = links.map(link => {
    const lengthMin = link.duration ? Math.round(timeToSeconds(link.duration) / 60) : null;
    return withWatchWindow(resourceLinkToTaskResource(link), lengthMin, watchBudget);
  });
  return {
    primary:       first ?? null,
    supplementary: rest.slice(0, 2),
  };
}
