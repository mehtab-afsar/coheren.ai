-- Migration: Contextual Retrieval + RAG Metadata Filters
-- Sprint 1 — Research-backed RAG enhancements
--
-- Adds:
--   enriched_content  — Anthropic-style contextual blurb prepended to chunk content
--                       (used as the embedded text when USE_CONTEXTUAL_RETRIEVAL is on)
--   framework         — Knowledge framework source (BJ_Fogg, SDT, MI, AtomicHabits, CBT…)
--   content_type      — theory | technique | exercise | research_finding
--   applicable_stones — stone types this chunk is relevant to
--   coaching_stage    — assessment | habit_design | recovery | maintenance
--   evidence_level    — anecdotal | case_study | RCT | meta_analysis
--   emotion_context   — emotion tags (frustration, plateau, anxiety…)
--   chunk_type        — raw | raptor_summary (for future RAPTOR hierarchical index)

-- ── enriched_content ──────────────────────────────────────────────────────────
ALTER TABLE knowledge_chunks
  ADD COLUMN IF NOT EXISTS enriched_content TEXT;

COMMENT ON COLUMN knowledge_chunks.enriched_content IS
  'Anthropic contextual retrieval: 50-100 token LLM-generated context blurb prepended '
  'to the raw content before embedding. Populated by scripts/ingest-knowledge.ts when '
  'CONTEXTUAL_RETRIEVAL=true. NULL means enrichment was not run yet.';

-- ── RAG metadata filter columns ───────────────────────────────────────────────
ALTER TABLE knowledge_chunks
  ADD COLUMN IF NOT EXISTS framework      TEXT,
  ADD COLUMN IF NOT EXISTS content_type   TEXT,
  ADD COLUMN IF NOT EXISTS applicable_stones TEXT[],
  ADD COLUMN IF NOT EXISTS coaching_stage TEXT,
  ADD COLUMN IF NOT EXISTS evidence_level TEXT,
  ADD COLUMN IF NOT EXISTS emotion_context TEXT[],
  ADD COLUMN IF NOT EXISTS chunk_type     TEXT DEFAULT 'raw';

COMMENT ON COLUMN knowledge_chunks.framework IS
  'Knowledge framework: BJ_Fogg | SDT | MI | AtomicHabits | CBT | Lally | Dreyfus | Cepeda | etc.';

COMMENT ON COLUMN knowledge_chunks.content_type IS
  'theory | technique | exercise | research_finding';

COMMENT ON COLUMN knowledge_chunks.applicable_stones IS
  'Stone types this chunk is relevant to, e.g. {FearOfFailure,Perfectionism}. '
  'Used by USE_RAG_METADATA_FILTERS to boost relevant chunks.';

COMMENT ON COLUMN knowledge_chunks.coaching_stage IS
  'assessment | habit_design | recovery | maintenance | onboarding';

COMMENT ON COLUMN knowledge_chunks.evidence_level IS
  'anecdotal | case_study | RCT | meta_analysis — quality of evidence behind this chunk';

COMMENT ON COLUMN knowledge_chunks.emotion_context IS
  'Emotion tags, e.g. {frustration,plateau,anxiety}. Used to retrieve contextually relevant chunks.';

COMMENT ON COLUMN knowledge_chunks.chunk_type IS
  'raw (default) | raptor_summary (future RAPTOR hierarchical index)';

-- ── Indexes for metadata-filtered retrieval ───────────────────────────────────
CREATE INDEX IF NOT EXISTS knowledge_chunks_framework_idx
  ON knowledge_chunks (framework)
  WHERE framework IS NOT NULL;

CREATE INDEX IF NOT EXISTS knowledge_chunks_coaching_stage_idx
  ON knowledge_chunks (coaching_stage)
  WHERE coaching_stage IS NOT NULL;

CREATE INDEX IF NOT EXISTS knowledge_chunks_chunk_type_idx
  ON knowledge_chunks (chunk_type);

-- GIN index for array columns (fast containment queries: applicable_stones @> ARRAY['FearOfFailure'])
CREATE INDEX IF NOT EXISTS knowledge_chunks_applicable_stones_gin
  ON knowledge_chunks USING GIN (applicable_stones)
  WHERE applicable_stones IS NOT NULL;

CREATE INDEX IF NOT EXISTS knowledge_chunks_emotion_context_gin
  ON knowledge_chunks USING GIN (emotion_context)
  WHERE emotion_context IS NOT NULL;
