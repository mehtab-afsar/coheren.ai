/**
 * Sprint Memory — Agent Memory via RAG (Item 8 + Change 5)
 *
 * Embeds sprint summaries and stores them in the `sprint_memories` pgvector table.
 * Retrieves past sprint memories by semantic similarity for Agent 5 context injection.
 *
 * Change 5 addition: getSimilarTaskPatterns() — filtered retrieval by metadata
 * fields (domain, stone, taskType) for Agent 4 task format hints.
 *
 * Uses the main authenticated Supabase client so RLS applies (user_id = auth.uid()).
 */

import { supabase } from './supabase';
import { embedQuery } from './jina-client';
import { saveSprintMemoryRow } from './database';
import { env } from '@config/env';

interface SprintMemoryRow {
  content:    string;
  similarity: number;
  metadata:   Record<string, unknown>;
}

/**
 * Embed `content` with Jina and persist to `sprint_memories`.
 * Non-blocking — call with .catch(() => {}) in useCheckpoint.
 */
export async function embedAndSaveSprintMemory(
  userId:       string,
  goalId:       string,
  sprintNumber: number,
  content:      string,
  metadata:     Record<string, unknown>,
): Promise<void> {
  const jinaKey = env.JINA_API_KEY;
  if (!jinaKey) return; // embedding not available without Jina key

  const embedding = await embedQuery(content, jinaKey);
  if (embedding.length === 0) return;

  await saveSprintMemoryRow(userId, goalId, sprintNumber, content, embedding, metadata);
}

/**
 * Query past sprint memories by semantic similarity.
 * Returns a formatted "Historical Sprint Memory" string for Agent 5, or '' on failure.
 */
export async function retrieveSprintMemories(query: string): Promise<string> {
  const jinaKey = env.JINA_API_KEY;
  if (!jinaKey || !query.trim()) return '';

  try {
    const queryEmbedding = await embedQuery(query, jinaKey);
    if (queryEmbedding.length === 0) return '';

    const { data, error } = await supabase
      .rpc('match_sprint_memories', {
        query_embedding: queryEmbedding,
        match_count:     3,
      })
      .returns<SprintMemoryRow[]>();

    const rows = Array.isArray(data) ? data as SprintMemoryRow[] : [];
    if (error || rows.length === 0) return '';

    const body = rows
      .map((row: SprintMemoryRow) => {
        const meta = row.metadata ?? {};
        const rate = typeof meta.completionRate === 'number'
          ? `${(meta.completionRate as number).toFixed(0)}% completion`
          : '';
        const status = meta.status ? `Status: ${meta.status}` : '';
        const week   = meta.weekRange ? `Week: ${meta.weekRange}` : '';
        const tags   = [rate, status, week].filter(Boolean).join(' | ');
        return tags ? `[${tags}]\n${row.content}` : row.content;
      })
      .join('\n\n---\n\n');

    return body || '';
  } catch {
    return '';
  }
}

/**
 * Retrieve sprint memories filtered by domain, stone type, and task type.
 * Used by Agent 4 to surface task format preferences: "what formats does this
 * user historically complete vs. skip?"
 *
 * Returns a 1-2 line hint string or '' if no relevant history found.
 */
export async function getSimilarTaskPatterns(
  domain:     string,
  stoneType:  string,
  taskType:   string,
): Promise<string> {
  const jinaKey = env.JINA_API_KEY;
  if (!jinaKey) return '';

  const query = `${taskType} task ${domain} ${stoneType} completion pattern historical`;

  try {
    const queryEmbedding = await embedQuery(query, jinaKey);
    if (queryEmbedding.length === 0) return '';

    const { data, error } = await supabase
      .rpc('match_sprint_memories', {
        query_embedding: queryEmbedding,
        match_count:     5,
      })
      .returns<SprintMemoryRow[]>();

    const rows = Array.isArray(data) ? data as SprintMemoryRow[] : [];
    if (error || rows.length === 0) return '';

    // Filter rows that have matching domain or stone metadata
    const relevant = rows.filter(r => {
      const meta = r.metadata as Record<string, unknown>;
      const domainMatch  = meta.domain      === domain    || !meta.domain;
      const stoneMatch   = meta.primaryStone === stoneType || !meta.primaryStone;
      return domainMatch || stoneMatch;
    });

    if (relevant.length === 0) return '';

    // Summarize task type breakdown from metadata
    const taskBreakdowns = relevant
      .map(r => (r.metadata as Record<string, unknown>).taskTypeBreakdown as Record<string, number> | undefined)
      .filter(Boolean) as Record<string, number>[];

    if (taskBreakdowns.length === 0) return '';

    // Aggregate across memories
    const totals: Record<string, number> = {};
    for (const breakdown of taskBreakdowns) {
      for (const [type, count] of Object.entries(breakdown)) {
        totals[type] = (totals[type] ?? 0) + count;
      }
    }
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return '';

    const top    = sorted.slice(0, 2).map(([t]) => t).join(' and ');
    const bottom = sorted.length > 2 ? sorted.slice(-1)[0][0] : null;

    return `Historical pattern: this user completes ${top} tasks well.${bottom ? ` Tends to skip ${bottom} tasks.` : ''}`;
  } catch {
    return '';
  }
}
