/**
 * Behavioral Retriever — Change 1 (Behavioral RAG Layer)
 *
 * Queries the sprint_memories pgvector table for behavioral patterns.
 * Unlike habit-science RAG (which retrieves research), this retrieves
 * *what actually happened* for this user and similar users.
 *
 * Two query modes:
 *   userHistory:       "What preceded this user's drops / peaks?"
 *   behavioralPatterns: "What task formats had highest completion for
 *                        users with this stone + status?"
 *
 * Uses the authenticated Supabase client so RLS applies automatically
 * (user_id = auth.uid()). No user_id param needed for user history.
 */

import { supabase } from '@lib/supabase';
import { embedQuery } from '@lib/jina-client';
import { env } from '@config/env';
import type { Agent2ProfileOutput } from '@types-app/agents';

interface BehavioralRetrievalParams {
  query:             string;
  stoneProfile?:     Agent2ProfileOutput;
  domain?:           string;
  phase?:            number;
  matchCount?:       number; // default 3
}

interface BehavioralMemoryRow {
  content:    string;
  similarity: number;
  metadata:   Record<string, unknown>;
}

/**
 * Retrieve user's own behavioral sprint memories by semantic similarity.
 * Returns formatted text or '' on failure.
 */
export async function retrieveUserHistory(
  params: BehavioralRetrievalParams,
): Promise<string> {
  if (!params.query.trim()) return '';

  try {
    // embedQuery routes through the ai-proxy edge function, which holds the real
    // Jina key server-side — this value is vestigial and ignored.
    const embedding = await embedQuery(params.query, env.JINA_API_KEY);
    if (embedding.length === 0) return '';

    const { data, error } = await supabase
      .rpc('match_sprint_memories', {
        query_embedding: embedding,
        match_count:     params.matchCount ?? 3,
      })
      .returns<BehavioralMemoryRow[]>();

    if (error || !data || !Array.isArray(data) || data.length === 0) return '';

    const rows = Array.isArray(data) ? (data as BehavioralMemoryRow[]) : [];
    // Filter to behavioral entries only (source=behavioral in metadata)
    const behavioral = rows.filter(r =>
      (r.metadata as Record<string, unknown>)?.source === 'behavioral'
    );
    if (behavioral.length === 0) return formatRows(rows); // fall back to all rows

    return formatRows(behavioral);
  } catch {
    return '';
  }
}

/**
 * Retrieve behavioral patterns matching a stone profile + domain.
 * Adds stone and domain context to the query for more precise retrieval.
 */
export async function retrieveBehavioralPatterns(
  params: BehavioralRetrievalParams,
): Promise<string> {
  if (!params.stoneProfile && !params.domain) {
    return retrieveUserHistory(params);
  }

  const primaryStone = params.stoneProfile?.stoneProfile.primaryStone ?? '';
  const enrichedQuery = [
    params.query,
    primaryStone ? `${primaryStone} stone behavioral pattern` : '',
    params.domain ? `${params.domain} domain` : '',
    params.phase  ? `phase ${params.phase}` : '',
  ].filter(Boolean).join(' ');

  return retrieveUserHistory({ ...params, query: enrichedQuery });
}

function formatRows(rows: BehavioralMemoryRow[]): string {
  return rows
    .map(row => {
      const meta = row.metadata ?? {};
      const tags = [
        meta.weekRange    ? `${meta.weekRange}`                           : '',
        meta.status       ? `Status: ${meta.status}`                     : '',
        meta.completionRate != null
          ? `${(meta.completionRate as number).toFixed(0)}% completion`  : '',
        meta.primaryStone ? `Stone: ${meta.primaryStone}`                : '',
      ].filter(Boolean).join(' | ');
      return tags ? `[${tags}]\n${row.content}` : row.content;
    })
    .join('\n\n---\n\n');
}
