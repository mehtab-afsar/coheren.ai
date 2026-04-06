#!/usr/bin/env node
/**
 * scripts/ingest-knowledge.ts
 *
 * Embeds all knowledge chunks via Jina AI v3 (retrieval.passage) and upserts
 * them into the Supabase knowledge_chunks table.
 *
 * Prerequisites:
 *   - knowledge_chunks table exists (migration 20260212000001_pgvector_knowledge.sql)
 *   - VITE_JINA_API_KEY    — get a free key at https://jina.ai (1M tokens/month)
 *   - VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY pointing to your Supabase instance
 *
 * Usage (Node 20+ built-in env-file loading):
 *   node --env-file=.env node_modules/.bin/tsx scripts/ingest-knowledge.ts
 *
 * Or add the npm script (already added):
 *   npm run rag:ingest
 *
 * The script is fully idempotent — re-running it updates existing rows via
 * ON CONFLICT (chunk_id) DO UPDATE, so embeddings stay current with content edits.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── Env ─────────────────────────────────────────────────────────────────────

const JINA_KEY     = process.env.VITE_JINA_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// Ingest script writes to knowledge_chunks — must use service_role key to bypass RLS.
// SUPABASE_SERVICE_ROLE_KEY is a server-only secret — never expose it in frontend code.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

if (!JINA_KEY)     { console.error('❌ VITE_JINA_API_KEY is not set'); process.exit(1); }
if (!SUPABASE_URL) { console.error('❌ VITE_SUPABASE_URL is not set');  process.exit(1); }
if (!SUPABASE_KEY) { console.error('❌ SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY) is not set'); process.exit(1); }

// ─── Supabase client ─────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Paths ───────────────────────────────────────────────────────────────────

const __filename   = fileURLToPath(import.meta.url);
const __dirname_ts = dirname(__filename);
const ROOT         = join(__dirname_ts, '..');
const FRAMEWORKS   = join(ROOT, 'src/knowledge/frameworks');
const DOMAINS      = join(ROOT, 'src/knowledge/domains');

// ─── Contextual enrichment config ────────────────────────────────────────────
// Anthropic Contextual Retrieval (2024): prepend a 50-100 token LLM-generated
// context blurb to each chunk before embedding.
// Research: 49% retrieval failure reduction (contextual + BM25); 67% with reranking.
// Cost: ~$1.02 per million document tokens with prompt caching.
//
// Gated by env var: CONTEXTUAL_RETRIEVAL=true (or VITE_FF_USE_CONTEXTUAL_RETRIEVAL=true)
// Requires: VITE_GROQ_API_KEY (uses Groq llama-3.1-8b-instant for low cost)

const ENABLE_CONTEXTUAL = process.env.CONTEXTUAL_RETRIEVAL === 'true'
  || process.env.VITE_FF_USE_CONTEXTUAL_RETRIEVAL === 'true';
const GROQ_KEY = process.env.VITE_GROQ_API_KEY;

// ─── Types ───────────────────────────────────────────────────────────────────

interface RawChunk {
  chunk_id:          string;
  content:           string;
  source:            string;
  categories:        string[];
  keywords:          string[];
  enriched_content?: string;  // Contextual blurb + original content (set during enrichment pass)
}

// ─── Static chunks (mirrored from src/core/rag/knowledge-base.ts) ────────────
// These are the curated, hand-written knowledge chunks that form the foundation
// of the knowledge base. Keep them in sync with knowledge-base.ts.

const STATIC_CHUNKS: RawChunk[] = [
  // ── Self-Determination Theory ──────────────────────────────────────────────
  {
    chunk_id: 'sdt-core',
    content: `Self-Determination Theory (Ryan & Deci): Humans have three innate psychological needs:
1. AUTONOMY - feeling of choice and self-direction ("I choose to do this")
2. COMPETENCE - feeling effective and capable, experiencing mastery
3. RELATEDNESS - feeling connected to others, sense of belonging
When these needs are satisfied, motivation and well-being increase.`,
    source: 'Ryan & Deci (2000)',
    categories: ['motivation', 'behavior-change'],
    keywords: ['motivation', 'autonomy', 'competence', 'relatedness', 'self-determination'],
  },
  {
    chunk_id: 'sdt-application',
    content: `To enhance motivation: Give choice in task timing/order (autonomy), start with achievable tasks and celebrate progress (competence), use warm supportive tone (relatedness). Avoid controlling language like "you must" - instead say "you might consider" or "when you're ready".`,
    source: 'Self-Determination Theory',
    categories: ['motivation', 'behavior-change'],
    keywords: ['motivation', 'coaching', 'language', 'support'],
  },

  // ── Habit Loop ────────────────────────────────────────────────────────────
  {
    chunk_id: 'habit-loop-core',
    content: `The Habit Loop (Charles Duhigg): Every habit follows CUE → ROUTINE → REWARD.
- CUE: Trigger that initiates behavior (location, time, emotion, people, preceding action)
- ROUTINE: The behavior itself (physical, mental, or emotional)
- REWARD: The benefit that reinforces the loop (pleasure, relief, satisfaction)
Golden Rule: You can't extinguish a habit, only change it. Keep same cue and reward, change the routine.`,
    source: 'The Power of Habit',
    categories: ['habit-formation', 'behavior-change'],
    keywords: ['habit', 'cue', 'routine', 'reward', 'trigger', 'loop'],
  },
  {
    chunk_id: 'habit-loop-keystone',
    content: `Keystone Habits: Certain habits create ripple effects. Exercise often leads to better eating, sleep, and productivity. Making your bed creates a sense of control. Family dinners improve children's grades. Identify if the user's goal could be a keystone habit that transforms other areas.`,
    source: 'The Power of Habit',
    categories: ['habit-formation'],
    keywords: ['keystone', 'ripple', 'exercise', 'cornerstone'],
  },

  // ── Four Laws of Behavior Change ──────────────────────────────────────────
  {
    chunk_id: 'four-laws-core',
    content: `Four Laws of Behavior Change (James Clear):
1. MAKE IT OBVIOUS (Cue) - Use implementation intentions: "I will [BEHAVIOR] at [TIME] in [LOCATION]"
2. MAKE IT ATTRACTIVE (Craving) - Temptation bundling, join supportive culture
3. MAKE IT EASY (Response) - Reduce friction, use 2-minute rule
4. MAKE IT SATISFYING (Reward) - Immediate rewards, habit tracking, never miss twice
To break bad habits, invert: make it invisible, unattractive, difficult, unsatisfying.`,
    source: 'Atomic Habits',
    categories: ['habit-formation', 'behavior-change'],
    keywords: ['obvious', 'attractive', 'easy', 'satisfying', 'atomic', 'laws'],
  },
  {
    chunk_id: 'two-minute-rule',
    content: `The Two-Minute Rule: When starting a new habit, scale it down to 2 minutes or less.
"Read before bed" → "Read one page"
"Run 5km" → "Put on running shoes"
"Study for exam" → "Open your notes"
This removes the motivation barrier. Master showing up first, then optimize.`,
    source: 'Atomic Habits',
    categories: ['habit-formation', 'beginner'],
    keywords: ['two-minute', 'tiny', 'small', 'start', 'beginner', 'easy'],
  },
  {
    chunk_id: 'habit-stacking',
    content: `Habit Stacking: Link new habits to existing ones using: "After [CURRENT HABIT], I will [NEW HABIT]"
Examples:
- After I pour my morning coffee, I will write one sentence in my journal
- After I sit at my desk, I will write my #1 priority
- After I brush my teeth, I will meditate for 2 minutes
The existing habit serves as a reliable cue for the new one.`,
    source: 'Atomic Habits',
    categories: ['habit-formation', 'behavior-change'],
    keywords: ['stacking', 'anchor', 'after', 'link', 'chain'],
  },
  {
    chunk_id: 'identity-habits',
    content: `Identity-Based Habits: The most effective change comes from identity, not outcomes.
"I want to lose weight" → "I am a healthy person"
"I want to read more" → "I am a reader"
"I want to run" → "I am a runner"
Every action is a vote for the type of person you want to become. Focus on who you wish to become, not what you want to achieve.`,
    source: 'Atomic Habits',
    categories: ['habit-formation', 'mindset'],
    keywords: ['identity', 'become', 'type of person', 'belief'],
  },
  {
    chunk_id: 'one-percent',
    content: `The 1% Rule: Getting 1% better each day compounds to 37x improvement over a year. Small habits seem insignificant in the moment but compound into remarkable results. Progress is not linear - it's exponential. Trust the process even when results aren't visible yet.`,
    source: 'Atomic Habits',
    categories: ['habit-formation', 'motivation'],
    keywords: ['compound', 'percent', 'better', 'growth', 'patience'],
  },

  // ── Tiny Habits ───────────────────────────────────────────────────────────
  {
    chunk_id: 'tiny-habits-core',
    content: `Tiny Habits (BJ Fogg): Behavior = Motivation × Ability × Prompt (B=MAP)
Formula: "After I [ANCHOR], I will [TINY BEHAVIOR], then I [CELEBRATE]"
Make the behavior so tiny (30 seconds) that motivation isn't required. Attach to existing routine. Celebrate immediately to wire in the habit. People change best by feeling good, not feeling bad.`,
    source: 'Tiny Habits',
    categories: ['habit-formation', 'beginner', 'behavior-change'],
    keywords: ['tiny', 'anchor', 'celebrate', 'small', 'motivation', 'prompt'],
  },
  {
    chunk_id: 'celebration-importance',
    content: `Celebration (BJ Fogg): Immediate positive emotion after completing a behavior is crucial for habit formation. Say "Yes!" or "Awesome!", do a small fist pump, smile genuinely. This creates positive emotional association and releases dopamine, wiring the habit into your brain. Fake celebrations don't work - feel genuine positive emotion.`,
    source: 'Tiny Habits',
    categories: ['celebration', 'habit-formation'],
    keywords: ['celebrate', 'reward', 'emotion', 'positive', 'dopamine'],
  },

  // ── Neuroscience ──────────────────────────────────────────────────────────
  {
    chunk_id: 'neuroscience-basics',
    content: `Neuroscience of Habits: The basal ganglia stores automated behavioral patterns. When learning new behaviors, prefrontal cortex is active (conscious effort). With repetition, basal ganglia takes over (automatic). Dopamine reinforces behaviors by signaling "this was good, do it again." Each successful habit execution releases dopamine, tagging the behavior for repetition.`,
    source: 'Neuroscience of Habit Formation (Wyatt 2024)',
    categories: ['neuroscience', 'habit-formation'],
    keywords: ['brain', 'basal ganglia', 'dopamine', 'automatic', 'neural'],
  },
  {
    chunk_id: 'neuroplasticity',
    content: `Neuroplasticity: The brain rewires itself throughout life. "Neurons that fire together wire together." Factors that enhance neuroplasticity: Sleep (consolidates learning), Exercise (releases BDNF), Meditation (increases cortical thickness), Morning sunlight (syncs circadian rhythm). Each repetition of a habit strengthens its neural pathway.`,
    source: 'The Brain That Changes Itself',
    categories: ['neuroscience'],
    keywords: ['neuroplasticity', 'brain', 'rewire', 'sleep', 'exercise', 'bdnf'],
  },
  {
    chunk_id: 'sleep-habits',
    content: `Sleep and Habit Formation: Memory consolidation happens during REM sleep. Sleep strengthens new neural pathways and prunes unused connections. Poor sleep = poor habit formation. Recommendations: consistent sleep/wake times, 7-9 hours, avoid screens before bed. Tell users: "Sleep is when your brain locks in today's progress."`,
    source: 'Neuroscience Research',
    categories: ['neuroscience'],
    keywords: ['sleep', 'memory', 'consolidation', 'rem', 'rest'],
  },
  {
    chunk_id: 'habit-timeline',
    content: `Habit Formation Timeline: Average time is 66 days, but ranges from 18 to 254 days depending on complexity and consistency. Simple habits form faster. What matters: daily consistency (not sporadic), same context/cue, emotional association through celebration. Missing once won't reset progress, but try not to miss twice.`,
    source: 'Research (Lally et al.)',
    categories: ['habit-formation', 'neuroscience'],
    keywords: ['days', 'time', 'how long', '66', 'timeline', 'duration'],
  },

  // ── Mindset ───────────────────────────────────────────────────────────────
  {
    chunk_id: 'growth-mindset',
    content: `Growth Mindset (Carol Dweck): Believing abilities can be developed through effort vs. fixed mindset (abilities are static). Growth mindset people: embrace challenges, persist through setbacks, see effort as path to mastery, learn from criticism, find inspiration in others' success. Praise effort and process, not innate ability.`,
    source: 'Mindset',
    categories: ['mindset', 'motivation'],
    keywords: ['growth', 'mindset', 'fixed', 'effort', 'learn', 'ability'],
  },
  {
    chunk_id: 'grit',
    content: `Grit (Angela Duckworth): Passion + Perseverance for long-term goals. Grit predicts success more than talent. Components: Interest (enjoying what you do), Practice (deliberate improvement), Purpose (believing work matters), Hope (persisting despite setbacks). Grit can be developed through experience and environment.`,
    source: 'Grit',
    categories: ['mindset', 'motivation'],
    keywords: ['grit', 'perseverance', 'passion', 'long-term', 'persist'],
  },

  // ── Struggling / Recovery ─────────────────────────────────────────────────
  {
    chunk_id: 'missing-days',
    content: `When users miss days: Missing once doesn't erase progress - neural pathways don't disappear. The "never miss twice" rule: one miss is an accident, two is a new pattern. Don't guilt-trip. Say: "Everyone misses sometimes. What matters is getting back on track today." The Fresh Start Effect: new weeks/months are good restart points.`,
    source: 'Atomic Habits + Research',
    categories: ['struggling', 'motivation'],
    keywords: ['miss', 'skip', 'fail', 'restart', 'recovery', 'back'],
  },
  {
    chunk_id: 'low-motivation',
    content: `For low motivation: Don't rely on motivation - it's unreliable. Instead: 1) Make the task tinier (2-minute rule), 2) Improve the cue (make it obvious), 3) Add immediate reward, 4) Remember identity ("I am someone who..."). Ask: "What's the smallest version you could do right now?"`,
    source: 'Tiny Habits + Atomic Habits',
    categories: ['struggling', 'motivation'],
    keywords: ['motivation', 'unmotivated', 'tired', 'lazy'],
  },
  {
    chunk_id: 'self-compassion',
    content: `Self-Compassion in Habit Change: Beating yourself up reduces motivation and increases likelihood of giving up. Treat yourself like you'd treat a friend who's struggling. Acknowledge difficulty without judgment. Research shows self-compassion leads to better habit adherence than self-criticism.`,
    source: 'Psychology Research',
    categories: ['struggling', 'mindset'],
    keywords: ['compassion', 'kind', 'forgive', 'guilt', 'shame', 'fail'],
  },

  // ── Energy & Timing ───────────────────────────────────────────────────────
  {
    chunk_id: 'energy-patterns',
    content: `Energy Patterns for Habits:
- MORNING: High cortisol, peak alertness → challenging/important tasks
- AFTERNOON: Post-lunch dip → routine/easier tasks
- EVENING: Declining willpower → easy habits, reflection
- Morning light exposure (10-30 min) optimizes circadian rhythm and cognitive function.
Match task difficulty to energy level for better success.`,
    source: 'Chronobiology Research',
    categories: ['productivity', 'neuroscience'],
    keywords: ['morning', 'evening', 'energy', 'time', 'when', 'schedule'],
  },
];

// ─── Markdown chunk extractor ─────────────────────────────────────────────────

const SOURCE_MAP: Record<string, string> = {
  // Frameworks
  'atomic-habits':             'Atomic Habits (James Clear)',
  'tiny-habits':               'Tiny Habits (BJ Fogg)',
  'habit-loop':                'The Power of Habit (Charles Duhigg)',
  'self-determination-theory': 'Self-Determination Theory (Ryan & Deci)',
  'neuroscience-of-habits':    'Neuroscience of Habit Formation',
  'neuroscience-habits':       'Neuroscience of Habit Formation',
  'four-laws-behavior-change': 'Atomic Habits — Four Laws',
  'mindset-and-grit':          'Mindset (Dweck) & Grit (Duckworth)',
  // Domains
  'programming':               'Coheren Domain KB — Programming',
  'language-learning':         'Coheren Domain KB — Language Learning',
  'exam-prep':                 'Coheren Domain KB — Exam Preparation',
  'running':                   'Coheren Domain KB — Running',
  'strength-training':         'Coheren Domain KB — Strength Training',
  'martial-arts':              'Coheren Domain KB — Martial Arts',
  'job-search':                'Coheren Domain KB — Job Search',
  'skill-development':         'Coheren Domain KB — Skill Development',
  'freelancing':               'Coheren Domain KB — Freelancing',
  'investing-beginner':        'Coheren Domain KB — Investing',
  'budgeting':                 'Coheren Domain KB — Budgeting',
  'side-income':               'Coheren Domain KB — Side Income',
  'writing':                   'Coheren Domain KB — Writing',
  'music':                     'Coheren Domain KB — Music',
  'video-content':             'Coheren Domain KB — Video Content',
  'weight-loss':               'Coheren Domain KB — Weight Loss',
  'sleep':                     'Coheren Domain KB — Sleep Optimization',
  'mental-health':             'Coheren Domain KB — Mental Health',
  'morning-routine':           'Coheren Domain KB — Morning Routine',
  'social-skills':             'Coheren Domain KB — Social Skills',
  'digital-detox':             'Coheren Domain KB — Digital Wellness',
  'procrastination-interventions': 'Coheren Coaching KB — Procrastination',
  'fear-of-failure-protocols': 'Coheren Coaching KB — Fear of Failure',
  'consistency-building':      'Coheren Coaching KB — Consistency',
  'perfectionism-breaking':    'Coheren Coaching KB — Perfectionism',
  'confidence-building':       'Coheren Coaching KB — Confidence',
};

const CATEGORY_MAP: Record<string, string[]> = {
  // Frameworks
  'atomic-habits':             ['habit-formation', 'behavior-change'],
  'tiny-habits':               ['habit-formation', 'beginner', 'behavior-change'],
  'habit-loop':                ['habit-formation', 'behavior-change'],
  'self-determination-theory': ['motivation', 'behavior-change'],
  'neuroscience-of-habits':    ['neuroscience', 'habit-formation'],
  'neuroscience-habits':       ['neuroscience', 'habit-formation'],
  'four-laws-behavior-change': ['habit-formation', 'behavior-change'],
  'mindset-and-grit':          ['mindset', 'motivation'],
  // Domains — Cognitive
  'programming':               ['skill-progression', 'cognitive'],
  'language-learning':         ['skill-progression', 'cognitive'],
  'exam-prep':                 ['skill-progression', 'cognitive'],
  // Domains — Kinesthetic
  'running':                   ['skill-progression', 'kinesthetic'],
  'strength-training':         ['skill-progression', 'kinesthetic'],
  'martial-arts':              ['skill-progression', 'kinesthetic'],
  // Domains — Career
  'job-search':                ['skill-progression', 'career'],
  'skill-development':         ['skill-progression', 'career'],
  'freelancing':               ['skill-progression', 'career'],
  // Domains — Financial
  'investing-beginner':        ['skill-progression', 'financial'],
  'budgeting':                 ['skill-progression', 'financial'],
  'side-income':               ['skill-progression', 'financial'],
  // Domains — Creative
  'writing':                   ['skill-progression', 'creative'],
  'music':                     ['skill-progression', 'creative'],
  'video-content':             ['skill-progression', 'creative'],
  // Domains — Health
  'weight-loss':               ['skill-progression', 'health'],
  'sleep':                     ['skill-progression', 'health'],
  'mental-health':             ['skill-progression', 'health'],
  // Domains — Lifestyle
  'morning-routine':           ['skill-progression', 'lifestyle'],
  'social-skills':             ['skill-progression', 'lifestyle'],
  'digital-detox':             ['skill-progression', 'lifestyle'],
  // Coaching
  'procrastination-interventions': ['coaching', 'behavior-change'],
  'fear-of-failure-protocols': ['coaching', 'behavior-change'],
  'consistency-building':      ['coaching', 'habit-formation'],
  'perfectionism-breaking':    ['coaching', 'behavior-change'],
  'confidence-building':       ['coaching', 'motivation'],
};

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'is','are','was','were','be','been','have','has','had','do','does','did',
  'will','would','could','should','may','might','this','that','these','those',
  'it','its','they','their','them','we','our','you','your','i','my','from',
  'by','as','not','no','so','if','when','then','than','can','also','into',
]);

function toKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));
  return [...new Set(words)].slice(0, 15);
}

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

function extractMarkdownChunks(filePath: string): RawChunk[] {
  const raw  = readFileSync(filePath, 'utf-8');
  const name = basename(filePath, '.md');

  // Split on ## headings (keep the heading text as the first line of each section)
  const sections = raw.split(/(?=^## )/m).filter(s => s.trim());
  const chunks: RawChunk[] = [];

  for (const section of sections) {
    const lines   = section.trim().split('\n');
    const heading = lines[0].replace(/^#+\s*/, '').trim();
    const body    = lines.slice(1).join('\n').trim();

    if (!body || body.length < 60) continue; // skip stubs

    const slug = slugify(heading);
    chunks.push({
      chunk_id:   `md-${name}-${slug}`,
      content:    `${heading}\n\n${body}`,
      source:     SOURCE_MAP[name] ?? name,
      categories: CATEGORY_MAP[name] ?? ['habit-formation'],
      keywords:   toKeywords(`${heading} ${body}`),
    });
  }

  return chunks;
}

// ─── Jina AI embedding ────────────────────────────────────────────────────────

const JINA_URL  = 'https://api.jina.ai/v1/embeddings';
const JINA_MODEL = 'jina-embeddings-v3';
const BATCH_SIZE = 8; // stay well within Jina's rate limits

async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch(JINA_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${JINA_KEY}`,
    },
    body: JSON.stringify({
      model:      JINA_MODEL,
      input:      texts,
      task:       'retrieval.passage', // ingestion task — do NOT use retrieval.query here
      dimensions: 1024,
      normalized: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jina API error ${res.status}: ${body}`);
  }

  const data = await res.json() as { data: Array<{ embedding: number[]; index: number }> };
  return data.data
    .sort((a, b) => a.index - b.index)
    .map(d => d.embedding);
}

// ─── Contextual enrichment (Anthropic Contextual Retrieval, 2024) ─────────────
//
// For each chunk, generates a 50-100 token context blurb via Groq llama-3.1-8b-instant.
// The blurb is prepended to the chunk content before embedding:
//   "This chunk is from [source], discussing [topic]. It explains [key insight]."
//
// Research: 49% retrieval failure reduction (contextual embeddings + BM25).
// Cost: ~$1.02 per million document tokens with prompt caching.
// Uses llama-3.1-8b-instant for minimal cost (~$0.05 per 1M tokens).

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_ECONOMY_MODEL = 'llama-3.1-8b-instant';

async function generateContextualBlurb(chunk: RawChunk): Promise<string> {
  if (!GROQ_KEY) return chunk.content;

  const prompt = `You are a knowledge indexing assistant. Generate a single sentence (max 80 tokens) that describes this chunk's context: which source it is from, what topic it covers, and what specific insight it provides. This sentence will be prepended to the chunk before embedding to improve retrieval.

Source: ${chunk.source}
Categories: ${chunk.categories.join(', ')}

Chunk content:
${chunk.content.slice(0, 800)}

Respond with ONLY the context sentence. No quotes, no labels, no explanation.`;

  try {
    const res = await fetch(GROQ_CHAT_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model:       GROQ_ECONOMY_MODEL,
        messages:    [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens:  100,
      }),
    });

    if (!res.ok) return chunk.content;

    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    const blurb = data.choices[0]?.message?.content?.trim();
    if (!blurb) return chunk.content;

    return `${blurb}\n\n${chunk.content}`;
  } catch {
    return chunk.content;
  }
}

/**
 * Run contextual enrichment pass on all chunks.
 * Adds enriched_content to each chunk (blurb + original content).
 * Falls back gracefully: if Groq is unavailable, enriched_content = original content.
 */
async function enrichChunks(chunks: RawChunk[]): Promise<void> {
  if (!ENABLE_CONTEXTUAL) return;

  console.log('\n  🧠  Contextual enrichment pass (Anthropic method)...');
  if (!GROQ_KEY) {
    console.warn('  ⚠   VITE_GROQ_API_KEY not set — skipping contextual enrichment.');
    console.warn('      Set CONTEXTUAL_RETRIEVAL=true and VITE_GROQ_API_KEY to enable.\n');
    return;
  }

  let enriched = 0;
  for (let i = 0; i < chunks.length; i++) {
    chunks[i].enriched_content = await generateContextualBlurb(chunks[i]);
    enriched++;
    if (i % 10 === 9 || i === chunks.length - 1) {
      process.stdout.write(`\r  Enriched ${String(enriched).padStart(3)} / ${chunks.length}`);
    }
    // Polite pause to respect Groq rate limits (400 RPM on free tier)
    if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 160));
  }
  console.log(`\n  ✓   ${enriched} chunks enriched with contextual blurbs.\n`);
}

// ─── Supabase upsert ──────────────────────────────────────────────────────────

async function upsertChunks(chunks: Array<RawChunk & { embedding: number[] }>) {
  const rows = chunks.map(c => ({
    chunk_id:          c.chunk_id,
    content:           c.content,
    enriched_content:  c.enriched_content ?? null,  // null if enrichment was skipped
    source:            c.source,
    categories:        c.categories,
    keywords:          c.keywords,
    embedding:         c.embedding as unknown as string, // supabase-js passes as JSON array; pgvector casts it
  }));

  const { error } = await supabase
    .from('knowledge_chunks')
    .upsert(rows, { onConflict: 'chunk_id' });

  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📚  RAG Knowledge Ingestion\n');
  console.log(`    Supabase: ${SUPABASE_URL}`);
  console.log(`    Jina key: ${JINA_KEY!.slice(0, 12)}...\n`);

  // 1. Start with hand-curated static chunks
  const all: RawChunk[] = [...STATIC_CHUNKS];

  // 2. Parse markdown framework files (richer, long-form content)
  if (existsSync(FRAMEWORKS)) {
    const mdFiles = readdirSync(FRAMEWORKS).filter(f => f.endsWith('.md'));
    for (const file of mdFiles) {
      const chunks = extractMarkdownChunks(join(FRAMEWORKS, file));
      console.log(`  📄  frameworks/${file}: ${chunks.length} sections`);
      all.push(...chunks);
    }
  } else {
    console.warn('  ⚠   src/knowledge/frameworks/ not found — using static chunks only\n');
  }

  // 3. Parse domain-specific knowledge files (subdirectories: cognitive, kinesthetic, etc.)
  if (existsSync(DOMAINS)) {
    const subDirs = readdirSync(DOMAINS, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const subDir of subDirs) {
      const subPath = join(DOMAINS, subDir);
      const mdFiles = readdirSync(subPath).filter(f => f.endsWith('.md'));
      for (const file of mdFiles) {
        const chunks = extractMarkdownChunks(join(subPath, file));
        console.log(`  📄  domains/${subDir}/${file}: ${chunks.length} sections`);
        all.push(...chunks);
      }
    }
  } else {
    console.warn('  ⚠   src/knowledge/domains/ not found — skipping domain KB\n');
  }

  // 3. Deduplicate by chunk_id (static chunks take priority)
  const seen  = new Set<string>();
  const unique = all.filter(c => {
    if (seen.has(c.chunk_id)) return false;
    seen.add(c.chunk_id);
    return true;
  });

  console.log(`\n  → ${unique.length} unique chunks to embed\n`);

  // 4. Contextual enrichment pass (USE_CONTEXTUAL_RETRIEVAL)
  //    Prepends a 50-100 token LLM-generated context blurb to each chunk.
  //    Must run BEFORE embedding so enriched text gets embedded, not raw text.
  await enrichChunks(unique);

  // 5. Embed in batches — use enriched_content when available, fall back to content
  const embedded: Array<RawChunk & { embedding: number[] }> = [];
  let totalTokens = 0;

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    const end   = Math.min(i + BATCH_SIZE, unique.length);

    process.stdout.write(`  Embedding ${String(i + 1).padStart(3)}–${String(end).padStart(3)} / ${unique.length} ... `);

    // Embed enriched_content if available (contextual retrieval) else raw content
    const embeddings = await embedBatch(batch.map(c => c.enriched_content ?? c.content));
    batch.forEach((chunk, j) => {
      embedded.push({ ...chunk, embedding: embeddings[j] });
      totalTokens += Math.ceil(chunk.content.length / 4); // rough estimate
    });

    process.stdout.write('✓\n');

    // Polite pause between Jina requests
    if (i + BATCH_SIZE < unique.length) {
      await new Promise(r => setTimeout(r, 350));
    }
  }

  console.log(`\n  ~${totalTokens.toLocaleString()} tokens estimated (Jina free: 1M/month)\n`);

  // 6. Upsert to Supabase in pages of 20
  const PAGE = 20;
  for (let i = 0; i < embedded.length; i += PAGE) {
    const batch = embedded.slice(i, i + PAGE);
    await upsertChunks(batch);
    const end = Math.min(i + PAGE, embedded.length);
    console.log(`  Upserted ${String(i + 1).padStart(3)}–${String(end).padStart(3)} / ${embedded.length}`);
  }

  console.log(`\n✅  Done. ${embedded.length} chunks now in knowledge_chunks.\n`);
  console.log('   Semantic retrieval is live — threshold 0.25, top-6 results.');
  console.log('   Re-run any time to update embeddings after content edits.\n');
}

main().catch(err => {
  console.error('\n❌  Ingestion failed:', (err as Error).message);
  process.exit(1);
});
