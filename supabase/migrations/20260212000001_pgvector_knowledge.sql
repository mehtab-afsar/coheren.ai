-- RAG Knowledge Base: pgvector semantic search
-- Created: 2026-02-12
-- Enables vector similarity search over chunked knowledge documents.
-- No RLS — knowledge_chunks is public scientific content, not user data.

-- ============================================================================
-- VECTOR EXTENSION
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- KNOWLEDGE_CHUNKS TABLE
-- Each row = one conceptual chunk from a science/framework document.
-- chunk_id is a stable slug (e.g. "atomic-habits_two-minute-rule") so
-- re-running the ingestion script is idempotent via upsert on conflict.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  chunk_id    TEXT        NOT NULL UNIQUE,     -- stable slug from ingest script
  content     TEXT        NOT NULL,            -- the actual text passage
  source      TEXT        NOT NULL,            -- e.g. "Atomic Habits"
  categories  TEXT[]      DEFAULT '{}',        -- e.g. ["habit-formation","beginner"]
  keywords    TEXT[]      DEFAULT '{}',        -- e.g. ["two-minute","start","easy"]
  embedding   vector(1024),                    -- Jina AI v3: 1024 dims, cosine-normalized
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- VECTOR INDEX
-- ivfflat with lists=10 is appropriate for corpora up to ~500 rows.
-- Upgrade to hnsw when chunk count exceeds 1000.
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
  ON public.knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

-- ============================================================================
-- MATCH FUNCTION
-- Called from the browser client via supabase.rpc('match_knowledge_chunks').
-- Returns top-k chunks above the similarity threshold, ordered best-first.
-- The RPC approach prevents the JS client from needing to decode vector columns.
-- ============================================================================
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(1024),
  match_threshold float  DEFAULT 0.55,
  match_count     int    DEFAULT 4
)
RETURNS TABLE (
  chunk_id    TEXT,
  content     TEXT,
  source      TEXT,
  categories  TEXT[],
  keywords    TEXT[],
  similarity  float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.chunk_id,
    c.content,
    c.source,
    c.categories,
    c.keywords,
    (1 - (c.embedding <=> query_embedding))::float AS similarity
  FROM public.knowledge_chunks c
  WHERE c.embedding IS NOT NULL
    AND (1 - (c.embedding <=> query_embedding)) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ============================================================================
-- FULL-TEXT SEARCH FALLBACK
-- Allows keyword-based retrieval when the embedding is NULL (before ingestion).
-- Called from the app as a fallback when the vector column is empty.
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_fts
  ON public.knowledge_chunks
  USING gin(to_tsvector('english', content));
