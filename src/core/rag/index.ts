/**
 * CONSIST RAG — Main Export
 *
 * Retrieval priority:
 *   1. retrieveKnowledgeWithFallback() — async, semantic (Jina + pgvector) with static fallback
 *   2. retrieveKnowledge()             — sync, static keyword scoring (always available)
 *   3. searchKnowledge()               — sync, static keyword filter
 *
 * Sprint 1 additions:
 *   - HyDE query expansion (USE_HYDE_QUERIES)
 *   - Metadata filter support (USE_RAG_METADATA_FILTERS)
 *   - Second-stage ColBERT reranking via reranker.ts (USE_COLBERT_RERANKING)
 */

export {
  retrieveKnowledge,
  retrieveKnowledgeWithFallback,
  searchKnowledge,
  getFullKnowledgeContext,
  type UserContext,
  type KnowledgeCategory,
} from './knowledge-base';

export {
  buildScienceBackedPrompt,
  buildOnboardingPrompt,
  getQuickPrompt,
  COACHING_PERSONAS,
} from './prompt-builder';

// Direct semantic retriever — for agents that build their own query string
export { retrieveKnowledgeSemantic, retrieveKnowledgeHybrid } from './semantic-retriever';
export type { SemanticRetrievalOptions } from './semantic-retriever';

export { type KnowledgeChunk, getBm25Candidates } from './knowledge-base';

// Behavioral RAG — queries sprint_memories for what actually worked
export { retrieveUserHistory, retrieveBehavioralPatterns } from './behavioral-retriever';

// Reranker — Jina cross-encoder second-stage reranking
export { rerankChunks, rerankStrings } from './reranker';

// ─── Imports ──────────────────────────────────────────────────────────────────

import { retrieveKnowledgeHybrid, retrieveKnowledgeSemantic } from './semantic-retriever';
import { retrieveUserHistory, retrieveBehavioralPatterns } from './behavioral-retriever';
import { flags } from '@config/feature-flags';
import { callEconomy } from '@lib/ai-router';
import type { Agent2ProfileOutput, StoneType } from '@types-app/agents';

// ─── Metadata Filters (USE_RAG_METADATA_FILTERS) ─────────────────────────────

/**
 * Pre-filter knowledge chunks by metadata before semantic search.
 * Maps to new columns added in Supabase migration (see plan).
 */
export interface RagFilters {
  /** e.g. 'BJ_Fogg' | 'SDT' | 'MI' | 'AtomicHabits' | 'CBT' */
  framework?:      string;
  /** e.g. 'theory' | 'technique' | 'exercise' | 'research_finding' */
  contentType?:    string;
  /** Filter to chunks applicable to these stone types */
  applicableStones?: StoneType[];
  /** e.g. 'assessment' | 'habit_design' | 'recovery' | 'maintenance' */
  coachingStage?:  string;
  /** e.g. 'RCT' | 'meta_analysis' | 'case_study' | 'anecdotal' */
  evidenceLevel?:  string;
  /** Emotion contexts relevant to this query */
  emotionContext?: string[];
}

// ─── HyDE — Hypothetical Document Embeddings ────────────────────────────────

/**
 * Generate a hypothetical ideal answer to expand a short or ambiguous query.
 * Research: Gao et al. (arXiv:2212.10496) — significant zero-shot retrieval improvement.
 *
 * Only runs when USE_HYDE_QUERIES is on AND query is short (< 20 words) or
 * contains only stone type names.
 */
async function expandQueryWithHyDE(query: string): Promise<string> {
  const wordCount = query.trim().split(/\s+/).length;
  if (!flags.USE_HYDE_QUERIES || wordCount >= 20) return query;

  try {
    const { content } = await callEconomy({
      messages: [
        {
          role: 'system',
          content: 'You are a habit science expert. Write a 100-word coaching insight answering the following topic. Be specific and evidence-based. Return only the insight, no preamble.',
        },
        {
          role: 'user',
          content: `Topic: ${query}`,
        },
      ],
      temperature: 0.3,
      max_tokens:  150,
    });
    return content?.trim() || query;
  } catch {
    return query;
  }
}

// ─── Augmented Context ────────────────────────────────────────────────────────

export interface AugmentedContext {
  habitScience:       string;  // habit science from static KB + pgvector
  behavioralPatterns: string;  // what worked for users with similar stones
  userHistory:        string;  // this user's own sprint history
}

/**
 * Returns all three retrieval layers merged.
 * Falls back gracefully: if behavioral RAG is off or fails, those fields are ''.
 *
 * Sprint 1: adds HyDE query expansion + metadata filter passthrough.
 */
export async function getAugmentedContext(params: {
  query:          string;
  userId?:        string;
  stoneProfile?:  Agent2ProfileOutput;
  domain?:        string;
  phase?:         number;
  matchCount?:    number;
  filters?:       RagFilters;
}): Promise<AugmentedContext> {
  // HyDE: expand short/ambiguous queries before retrieval
  const effectiveQuery = await expandQueryWithHyDE(params.query);

  const ragFn = flags.USE_HYBRID_RAG ? retrieveKnowledgeHybrid : retrieveKnowledgeSemantic;

  // Build boost arrays from metadata filters if enabled
  const boostCategories: string[] = [];
  const boostKeywords:   string[] = [];
  if (flags.USE_RAG_METADATA_FILTERS && params.filters) {
    const f = params.filters;
    if (f.framework)        boostCategories.push(f.framework);
    if (f.coachingStage)    boostCategories.push(f.coachingStage);
    if (f.applicableStones) boostKeywords.push(...f.applicableStones);
    if (f.emotionContext)   boostKeywords.push(...f.emotionContext);
  }

  const [habitScience, behavioralPatterns, userHistory] = await Promise.all([
    ragFn({
      query:           effectiveQuery,
      matchCount:      params.matchCount ?? 3,
      boostCategories,
      boostKeywords,
    }).catch(() => ''),
    flags.USE_BEHAVIORAL_RAG
      ? retrieveBehavioralPatterns({
          query:        effectiveQuery,
          stoneProfile: params.stoneProfile,
          domain:       params.domain,
          phase:        params.phase,
          matchCount:   2,
        }).catch(() => '')
      : Promise.resolve(''),
    flags.USE_BEHAVIORAL_RAG
      ? retrieveUserHistory({ query: effectiveQuery, matchCount: 2 }).catch(() => '')
      : Promise.resolve(''),
  ]);

  return { habitScience, behavioralPatterns, userHistory };
}
