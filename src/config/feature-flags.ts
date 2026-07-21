/**
 * Feature Flags
 *
 * Centralized feature toggle system.
 * Precedence: localStorage override > env var > default
 *
 * Usage: import { flags } from '@config/feature-flags';
 * Override: localStorage.setItem('ff_USE_AI_AGENTS', 'false') then reload
 * Or via URL: ?ff_USE_AI_AGENTS=false (auto-sets localStorage)
 */

interface FeatureFlags {
  /** Use AI agent pipeline (Agents 1-5). If false, use static fallback generators. */
  USE_AI_AGENTS: boolean;
  /** Enable RAG semantic retrieval for task generation context. */
  USE_RAG: boolean;
  /** Enable checkpoint recalibration (Agent 5). If false, skip recalibration. */
  USE_RECALIBRATION: boolean;
  /** Enable agent logging to Supabase agent_logs table. */
  LOG_AGENT_RUNS: boolean;
  /** Enable push notifications. */
  PUSH_NOTIFICATIONS: boolean;
  /** Show debug panel access (via ?debug=agents). */
  DEBUG_PANEL: boolean;
  /** Enable pre-generating next-day tasks in background. */
  PREGENERATE_TASKS: boolean;
  /** Compress sprint history into BehaviouralSnapshot after 4+ sprints. */
  COMPRESS_SPRINT_HISTORY: boolean;
  /** Save/restore agent pipeline checkpoints in localStorage for resume-on-retry. */
  PIPELINE_CHECKPOINTS: boolean;
  /** Run Agent 3 + RAG pre-fetch in parallel (wave 2). Enable after 1-week soak. */
  PARALLEL_AGENT_EXECUTION: boolean;
  /** Fire micro-recalibration adjustments based on streak/completion triggers. */
  EVENT_DRIVEN_RECALIBRATION: boolean;
  /** Run shadow pipeline for A/B comparison. Dev/staging only — never enable in prod. */
  SHADOW_PIPELINE: boolean;
  /** Pre-generate Day N+1 tasks in background after advanceDay(). */
  BACKGROUND_TASK_PREGENERATION: boolean;
  /** Record per-agent latency in agent_logs (additive log field). */
  AGENT_TIMING_METRICS: boolean;
  /** Allow LLM calls inside micro-recalibration and sprint compression. */
  MICRO_RECALIBRATION_AI_CALLS: boolean;
  /** Use native function calling (tool use) instead of JSON mode + repairJSON(). Default: false — soak per-agent. */
  USE_TOOL_CALLING: boolean;
  /** Use BM25 + semantic RRF merge (+ optional Jina Reranker) for RAG retrieval. Default: false — soak after validation. */
  USE_HYBRID_RAG: boolean;
  /** Use two-pass Chain-of-Thought prompting for Agent 5 recalibration. Default: false — soak after validation. */
  USE_AGENT5_COT: boolean;
  /** Nudge per-user recalibration thresholds based on sprint outcome history. Default: false — enable after 2-sprint soak. */
  ADAPTIVE_THRESHOLDS: boolean;
  /** Generate light/standard/deep task variants in parallel; show picker in TodayView. Default: false — enable after UX validation. */
  USE_TASK_VARIANTS: boolean;
  /** Embed sprint summaries into pgvector and inject longitudinal memory into Agent 5. Default: false — enable after migration runs. */
  USE_AGENT_MEMORY: boolean;
  /** Query sprint_memories for behavioral patterns and inject into Agent 3 + 5 prompts. Default: false — enable after behaviorEmbedder wired. */
  USE_BEHAVIORAL_RAG: boolean;
  /** Replace hardcoded stone matrices with LLM tool-use loops in Agent 3 + 5. Default: false — shadow-test before enabling. */
  USE_AGENT_TOOL_CALLING: boolean;
  /** Use Claude claude-sonnet-4-6 with extended thinking for Agent 3 curriculum design. Default: false — requires Claude enabled (VITE_CLAUDE_ENABLED). */
  USE_CLAUDE_FOR_CURRICULUM: boolean;
  /** Use Claude claude-sonnet-4-6 with native tool use for Agent 5 recalibration. Default: false — requires USE_AGENT_TOOL_CALLING + VITE_CLAUDE_ENABLED. */
  USE_CLAUDE_FOR_RECALIBRATION: boolean;
  /** Enable stone resolution (severity < 0.2) and emergence (new skip patterns) after each sprint. Default: false. */
  DYNAMIC_STONE_EVOLUTION: boolean;
  /** Inject sprint memory context into Agents 3 and 4 (not just Agent 5). Default: false — enable after USE_AGENT_MEMORY stable. */
  USE_SPRINT_MEMORY_IN_ALL_AGENTS: boolean;
  /** Use semantic Supabase resource retrieval instead of static resourceLibrary.ts. Default: false — requires ingest script to run first. */
  USE_DYNAMIC_RESOURCES: boolean;

  // ── Sprint 1: RAG Enhancement ──────────────────────────────────────────────
  /** Prepend Anthropic-style 50-100 token context blurb to each chunk before embedding (49-67% retrieval failure reduction). Default: true — run ingest-knowledge.ts to populate enriched_content column. */
  USE_CONTEXTUAL_RETRIEVAL: boolean;
  /** Pre-filter knowledge_chunks by stone/coaching_stage/framework metadata before semantic search. Default: true — requires metadata columns migration. */
  USE_RAG_METADATA_FILTERS: boolean;
  /** Second-stage Jina cross-encoder reranking: retrieve top-16, rerank to top-5. Default: false — enable after validation. */
  USE_COLBERT_RERANKING: boolean;
  /** HyDE (Hypothetical Document Embeddings): for short/ambiguous queries, generate a hypothetical answer first then embed it. Default: false — enable after soak. */
  USE_HYDE_QUERIES: boolean;
  /** RAPTOR hierarchical chunk tree: raw chunks → cluster summaries → document summaries. Default: false — requires build-raptor-index.ts script. */
  USE_RAPTOR_INDEX: boolean;

  // ── Sprint 1: Agent 2 Improvements ────────────────────────────────────────
  /** Replace 3 static questions with MI-based adaptive interview (OARS + funnel technique, 5-7 questions). Default: false — enable after interview-engine.ts validated. */
  USE_ADAPTIVE_INTERVIEW: boolean;
  /** Detect hedge density, change-talk ratio, passive voice, and conditional language in answers. Default: false — enable after linguistic-analyzer.ts validated. */
  USE_LINGUISTIC_SIGNALS: boolean;
  /** Always ask importance (1-10) + self-efficacy (1-10) questions (Miller & Rollnick readiness ruler). Default: true — safe to enable immediately. */
  USE_READINESS_RULER: boolean;

  // ── Sprint 1: Curriculum Improvements ─────────────────────────────────────
  /** Hybrid curriculum planning: skeleton + phase gates upfront, week-by-week details generated on demand. Default: false — enable after CurriculumSkeleton model validated. */
  USE_ROLLING_CURRICULUM: boolean;
  /** Scale timeline based on daily time budget using sqrt formula: adjustedTimeline = raw × (60/dailyMinutes)^0.5. Default: true — safe to enable immediately. */
  USE_TIMELINE_SCALING: boolean;
  /** BCT (Behavior Change Technique) decomposition for behavior-based goals (discipline, focus). Default: false — enable after BCT prompt validated. */
  USE_BCT_DECOMPOSITION: boolean;
  /** Wire science-backed spaced repetition pattern into Week 1 day skeletons (Mon=new, Tue=review, Wed=new, Thu=mixed, Fri=practice, Sat=week review, Sun=rest). Default: true. */
  USE_SPACED_REPETITION_SCHEDULE: boolean;
}

const DEFAULTS: FeatureFlags = {
  USE_AI_AGENTS:      true,
  USE_RAG:            true,
  USE_RECALIBRATION:  true,
  LOG_AGENT_RUNS:     false, // Off by default — enable via VITE_FF_LOG_AGENT_RUNS=true in prod
  PUSH_NOTIFICATIONS: true,
  DEBUG_PANEL:        false, // Off in prod — the agent-health panel exposes internal latency/errors
  PREGENERATE_TASKS:  true,
  COMPRESS_SPRINT_HISTORY:        true,
  PIPELINE_CHECKPOINTS:           true,
  PARALLEL_AGENT_EXECUTION:       true,
  EVENT_DRIVEN_RECALIBRATION:     false,
  SHADOW_PIPELINE:                false,
  BACKGROUND_TASK_PREGENERATION:  false,
  AGENT_TIMING_METRICS:           true,
  MICRO_RECALIBRATION_AI_CALLS:   false,
  USE_TOOL_CALLING:               false, // Off by default — enable per-agent after validation
  USE_HYBRID_RAG:                 false, // Off by default — enable after BM25+RRF validation
  USE_AGENT5_COT:                 false, // Off by default — enable after CoT quality validation
  ADAPTIVE_THRESHOLDS:            false, // Off by default — enable after 2-sprint soak
  USE_TASK_VARIANTS:              false, // Off by default — enable after UX validation
  USE_AGENT_MEMORY:               false, // Off by default — enable after sprint_memories migration
  USE_BEHAVIORAL_RAG:             false, // Off by default — enable after behaviorEmbedder wired
  USE_AGENT_TOOL_CALLING:         false, // Off by default — shadow-test before enabling
  USE_CLAUDE_FOR_CURRICULUM:      false, // Off by default — requires Claude enabled (VITE_CLAUDE_ENABLED)
  USE_CLAUDE_FOR_RECALIBRATION:   false, // Off by default — requires USE_AGENT_TOOL_CALLING + VITE_CLAUDE_ENABLED
  DYNAMIC_STONE_EVOLUTION:        true,  // On — stone resolution + emergence active
  USE_SPRINT_MEMORY_IN_ALL_AGENTS: false, // Off — enable after USE_AGENT_MEMORY stable
  USE_DYNAMIC_RESOURCES:          true,  // On — static library fallback active immediately

  // Sprint 1: RAG Enhancement
  USE_CONTEXTUAL_RETRIEVAL:       true,  // On by default — run ingest-knowledge.ts to populate enriched_content
  USE_RAG_METADATA_FILTERS:       true,  // On by default — requires metadata columns migration
  USE_COLBERT_RERANKING:          false, // Off by default — enable after Jina cross-encoder validation
  USE_HYDE_QUERIES:               false, // Off by default — enable after soak
  USE_RAPTOR_INDEX:               false, // Off unless `npm run rag:raptor` has ingested L1 summaries — otherwise it only ×1.5 over-fetches. Semantic RAG works without it.

  // Sprint 1: Agent 2 Improvements
  USE_ADAPTIVE_INTERVIEW:         true,  // On — adaptive interview engine active
  USE_LINGUISTIC_SIGNALS:         false, // Off by default — enable after linguistic-analyzer.ts validated
  USE_READINESS_RULER:            true,  // On by default — safe to enable immediately

  // Sprint 1: Curriculum Improvements
  USE_ROLLING_CURRICULUM:         true,  // On — rolling curriculum skeleton active
  USE_TIMELINE_SCALING:           true,  // On by default — safe to enable immediately
  USE_BCT_DECOMPOSITION:          false, // Off by default — enable after BCT prompt validated
  USE_SPACED_REPETITION_SCHEDULE: true,  // On by default — science-backed weekly review pattern
};

const LS_PREFIX = 'ff_';

function resolveFlag(key: keyof FeatureFlags): boolean {
  // 1. localStorage override (guarded — localStorage may be absent in test/SSR environments)
  try {
    const lsValue = localStorage.getItem(`${LS_PREFIX}${key}`);
    if (lsValue === 'true') return true;
    if (lsValue === 'false') return false;
  } catch {
    // localStorage not available — fall through to env var / default
  }

  // 2. env var (VITE_FF_<FLAG_NAME>)
  const envKey = `VITE_FF_${key}`;
  const envValue = (import.meta.env[envKey] as string | undefined)?.trim().toLowerCase();
  if (envValue === 'true' || envValue === '1') return true;
  if (envValue === 'false' || envValue === '0') return false;

  // 3. Default
  return DEFAULTS[key];
}

/** Apply URL-based overrides: ?ff_USE_AI_AGENTS=false */
function applyUrlOverrides(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  let changed = false;
  for (const key of Object.keys(DEFAULTS)) {
    const urlValue = params.get(`${LS_PREFIX}${key}`);
    if (urlValue === 'true' || urlValue === 'false') {
      localStorage.setItem(`${LS_PREFIX}${key}`, urlValue);
      changed = true;
    }
  }
  if (changed) {
    // Remove ff_ params from URL to clean up
    for (const key of Object.keys(DEFAULTS)) {
      params.delete(`${LS_PREFIX}${key}`);
    }
    const cleanUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', cleanUrl);
  }
}

// Apply URL overrides on module load
applyUrlOverrides();

/** Resolved feature flags (read-only). */
export const flags: Readonly<FeatureFlags> = Object.freeze(
  Object.fromEntries(
    (Object.keys(DEFAULTS) as (keyof FeatureFlags)[]).map(key => [key, resolveFlag(key)])
  ) as unknown as FeatureFlags
);

/** Reset a flag to default (remove localStorage override). */
export function resetFlag(key: keyof FeatureFlags): void {
  localStorage.removeItem(`${LS_PREFIX}${key}`);
}

/** Reset all flags to defaults. */
export function resetAllFlags(): void {
  for (const key of Object.keys(DEFAULTS)) {
    localStorage.removeItem(`${LS_PREFIX}${key}`);
  }
}

/** Log current flag state (useful in dev console). */
export function logFlags(): void {
  console.table(
    Object.fromEntries(
      (Object.keys(DEFAULTS) as (keyof FeatureFlags)[]).map(key => [
        key,
        {
          value: flags[key],
          source: localStorage.getItem(`${LS_PREFIX}${key}`) != null ? 'localStorage'
            : (import.meta.env[`VITE_FF_${key}`] as string | undefined) ? 'env'
            : 'default',
        },
      ])
    )
  );
}
