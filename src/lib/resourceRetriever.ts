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
import type { TaskResource } from '@types-app/agents';
import type { ResourceLink } from './resourceLibrary';

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
  const jinaKey = env.JINA_API_KEY;

  // No Jina key → fall back to static library immediately
  if (!jinaKey) return staticFallback(params);

  try {
    // Build a rich query combining task title + domain + stone context
    const stoneContext = params.stoneTypes.slice(0, 2).join(' ');
    const query = [
      params.taskTitle,
      params.domain,
      params.goalText ? params.goalText.slice(0, 60) : '',
      stoneContext,
    ].filter(Boolean).join(' ');

    const embedding = await embedQuery(query, jinaKey);
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
    const [primary, ...rest] = candidates.map(mapToTaskResource);

    return {
      primary:       primary ?? null,
      supplementary: rest.slice(0, 2),
    };
  } catch {
    return staticFallback(params);
  }
}

function staticFallback(
  params: ResourceRetrievalParams,
): { primary: TaskResource | null; supplementary: TaskResource[] } {
  const goalText = params.goalText ?? params.taskTitle;
  const links = getResourcesForGoal(goalText);

  if (links.length === 0) return { primary: null, supplementary: [] };

  const [first, ...rest] = links.map(resourceLinkToTaskResource);
  return {
    primary:       first ?? null,
    supplementary: rest.slice(0, 2),
  };
}
