# Coheren Knowledge Base

This directory contains the scientific library that powers the RAG system.
Each file is ingested by `scripts/ingest-knowledge.ts` into Supabase pgvector.

## Directory Structure

```
src/knowledge/
├── frameworks/          ← Habit science, psychology, neuroscience frameworks
│   ├── atomic-habits.md
│   ├── tiny-habits.md
│   ├── habit-loop.md
│   ├── neuroscience-of-habits.md
│   ├── self-determination-theory.md
│   └── mindset-and-grit.md
└── domain-specific/     ← Goal-domain expert knowledge
    ├── boxing/
    ├── fitness/
    └── coding/
```

## How to Add a Book

1. Create a `.md` file in the appropriate folder
2. Use `## Section Heading` (level 2) to divide chapters — each section becomes one chunk
3. Keep sections between 200–800 characters for best retrieval quality
4. Run the ingestion script: `npx tsx scripts/ingest-knowledge.ts`

## File Format

```markdown
# Book Title — Author Name

## Section Title
Your content here. Each ## heading creates a separate chunk in the vector DB.
The chunk ID is derived from the filename + heading, so re-ingestion is idempotent.

## Another Section
More content...
```

## Ingestion Script Requirements

Add these to your `.env` before running:
- `VITE_SUPABASE_URL` — already present
- `SUPABASE_SERVICE_ROLE_KEY` — find in Supabase dashboard → Settings → API
- `VITE_JINA_API_KEY` — free at https://jina.ai (1M tokens/month, no credit card)

Run: `npx tsx scripts/ingest-knowledge.ts`

## Domain-Specific Knowledge Format

For boxing, fitness, coding — follow the same format but tag sections with their
domain keywords so Agent 1 can narrow retrieval:

```markdown
## Jab Technique — Shoulder Rotation
The jab is initiated by rotating the lead shoulder forward while extending the arm.
Weight remains on the rear foot at the moment of extension.
[source: Boxing Manual for Coaches]
```
