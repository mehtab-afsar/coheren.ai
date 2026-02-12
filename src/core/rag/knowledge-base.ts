/**
 * CONSIST RAG - Knowledge Base
 * Static knowledge from habit science frameworks for AI coaching.
 * This provides immediate science-backed context without requiring
 * the full PDF extraction pipeline.
 */

// Knowledge categories for retrieval
export type KnowledgeCategory =
  | 'habit-formation'
  | 'motivation'
  | 'neuroscience'
  | 'behavior-change'
  | 'mindset'
  | 'productivity'
  | 'struggling'
  | 'beginner'
  | 'celebration';

// User context for personalized retrieval
export interface UserContext {
  goal?: string;
  category?: string;
  energyPattern?: 'morning' | 'afternoon' | 'evening' | 'night';
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  currentStruggle?: string;
  completionRate?: number;
  streak?: number;
}

// Knowledge chunk structure
interface KnowledgeChunk {
  id: string;
  content: string;
  source: string;
  categories: KnowledgeCategory[];
  keywords: string[];
}

// Core knowledge base (curated from frameworks)
const KNOWLEDGE_BASE: KnowledgeChunk[] = [
  // Self-Determination Theory
  {
    id: 'sdt-core',
    content: `Self-Determination Theory (Ryan & Deci): Humans have three innate psychological needs:
1. AUTONOMY - feeling of choice and self-direction ("I choose to do this")
2. COMPETENCE - feeling effective and capable, experiencing mastery
3. RELATEDNESS - feeling connected to others, sense of belonging
When these needs are satisfied, motivation and well-being increase.`,
    source: 'Ryan & Deci (2000)',
    categories: ['motivation', 'behavior-change'],
    keywords: ['motivation', 'autonomy', 'competence', 'relatedness', 'self-determination']
  },
  {
    id: 'sdt-application',
    content: `To enhance motivation: Give choice in task timing/order (autonomy), start with achievable tasks and celebrate progress (competence), use warm supportive tone (relatedness). Avoid controlling language like "you must" - instead say "you might consider" or "when you're ready".`,
    source: 'Self-Determination Theory',
    categories: ['motivation', 'behavior-change'],
    keywords: ['motivation', 'coaching', 'language', 'support']
  },

  // Habit Loop
  {
    id: 'habit-loop-core',
    content: `The Habit Loop (Charles Duhigg): Every habit follows CUE → ROUTINE → REWARD.
- CUE: Trigger that initiates behavior (location, time, emotion, people, preceding action)
- ROUTINE: The behavior itself (physical, mental, or emotional)
- REWARD: The benefit that reinforces the loop (pleasure, relief, satisfaction)
Golden Rule: You can't extinguish a habit, only change it. Keep same cue and reward, change the routine.`,
    source: 'The Power of Habit',
    categories: ['habit-formation', 'behavior-change'],
    keywords: ['habit', 'cue', 'routine', 'reward', 'trigger', 'loop']
  },
  {
    id: 'habit-loop-keystone',
    content: `Keystone Habits: Certain habits create ripple effects. Exercise often leads to better eating, sleep, and productivity. Making your bed creates a sense of control. Family dinners improve children's grades. Identify if the user's goal could be a keystone habit that transforms other areas.`,
    source: 'The Power of Habit',
    categories: ['habit-formation'],
    keywords: ['keystone', 'ripple', 'exercise', 'cornerstone']
  },

  // Four Laws of Behavior Change
  {
    id: 'four-laws-core',
    content: `Four Laws of Behavior Change (James Clear):
1. MAKE IT OBVIOUS (Cue) - Use implementation intentions: "I will [BEHAVIOR] at [TIME] in [LOCATION]"
2. MAKE IT ATTRACTIVE (Craving) - Temptation bundling, join supportive culture
3. MAKE IT EASY (Response) - Reduce friction, use 2-minute rule
4. MAKE IT SATISFYING (Reward) - Immediate rewards, habit tracking, never miss twice
To break bad habits, invert: make it invisible, unattractive, difficult, unsatisfying.`,
    source: 'Atomic Habits',
    categories: ['habit-formation', 'behavior-change'],
    keywords: ['obvious', 'attractive', 'easy', 'satisfying', 'atomic', 'laws']
  },
  {
    id: 'two-minute-rule',
    content: `The Two-Minute Rule: When starting a new habit, scale it down to 2 minutes or less.
"Read before bed" → "Read one page"
"Run 5km" → "Put on running shoes"
"Study for exam" → "Open your notes"
This removes the motivation barrier. Master showing up first, then optimize.`,
    source: 'Atomic Habits',
    categories: ['habit-formation', 'beginner'],
    keywords: ['two-minute', 'tiny', 'small', 'start', 'beginner', 'easy']
  },
  {
    id: 'habit-stacking',
    content: `Habit Stacking: Link new habits to existing ones using: "After [CURRENT HABIT], I will [NEW HABIT]"
Examples:
- After I pour my morning coffee, I will write one sentence in my journal
- After I sit at my desk, I will write my #1 priority
- After I brush my teeth, I will meditate for 2 minutes
The existing habit serves as a reliable cue for the new one.`,
    source: 'Atomic Habits',
    categories: ['habit-formation', 'behavior-change'],
    keywords: ['stacking', 'anchor', 'after', 'link', 'chain']
  },
  {
    id: 'identity-habits',
    content: `Identity-Based Habits: The most effective change comes from identity, not outcomes.
"I want to lose weight" → "I am a healthy person"
"I want to read more" → "I am a reader"
"I want to run" → "I am a runner"
Every action is a vote for the type of person you want to become. Focus on who you wish to become, not what you want to achieve.`,
    source: 'Atomic Habits',
    categories: ['habit-formation', 'mindset'],
    keywords: ['identity', 'become', 'type of person', 'belief']
  },
  {
    id: 'one-percent',
    content: `The 1% Rule: Getting 1% better each day compounds to 37x improvement over a year. Small habits seem insignificant in the moment but compound into remarkable results. Progress is not linear - it's exponential. Trust the process even when results aren't visible yet.`,
    source: 'Atomic Habits',
    categories: ['habit-formation', 'motivation'],
    keywords: ['compound', 'percent', 'better', 'growth', 'patience']
  },

  // Tiny Habits
  {
    id: 'tiny-habits-core',
    content: `Tiny Habits (BJ Fogg): Behavior = Motivation × Ability × Prompt (B=MAP)
Formula: "After I [ANCHOR], I will [TINY BEHAVIOR], then I [CELEBRATE]"
Make the behavior so tiny (30 seconds) that motivation isn't required. Attach to existing routine. Celebrate immediately to wire in the habit. People change best by feeling good, not feeling bad.`,
    source: 'Tiny Habits',
    categories: ['habit-formation', 'beginner', 'behavior-change'],
    keywords: ['tiny', 'anchor', 'celebrate', 'small', 'motivation', 'prompt']
  },
  {
    id: 'celebration-importance',
    content: `Celebration (BJ Fogg): Immediate positive emotion after completing a behavior is crucial for habit formation. Say "Yes!" or "Awesome!", do a small fist pump, smile genuinely. This creates positive emotional association and releases dopamine, wiring the habit into your brain. Fake celebrations don't work - feel genuine positive emotion.`,
    source: 'Tiny Habits',
    categories: ['celebration', 'habit-formation'],
    keywords: ['celebrate', 'reward', 'emotion', 'positive', 'dopamine']
  },

  // Neuroscience
  {
    id: 'neuroscience-basics',
    content: `Neuroscience of Habits: The basal ganglia stores automated behavioral patterns. When learning new behaviors, prefrontal cortex is active (conscious effort). With repetition, basal ganglia takes over (automatic). Dopamine reinforces behaviors by signaling "this was good, do it again." Each successful habit execution releases dopamine, tagging the behavior for repetition.`,
    source: 'Neuroscience of Habit Formation (Wyatt 2024)',
    categories: ['neuroscience', 'habit-formation'],
    keywords: ['brain', 'basal ganglia', 'dopamine', 'automatic', 'neural']
  },
  {
    id: 'neuroplasticity',
    content: `Neuroplasticity: The brain rewires itself throughout life. "Neurons that fire together wire together." Factors that enhance neuroplasticity: Sleep (consolidates learning), Exercise (releases BDNF), Meditation (increases cortical thickness), Morning sunlight (syncs circadian rhythm). Each repetition of a habit strengthens its neural pathway.`,
    source: 'The Brain That Changes Itself',
    categories: ['neuroscience'],
    keywords: ['neuroplasticity', 'brain', 'rewire', 'sleep', 'exercise', 'bdnf']
  },
  {
    id: 'sleep-habits',
    content: `Sleep and Habit Formation: Memory consolidation happens during REM sleep. Sleep strengthens new neural pathways and prunes unused connections. Poor sleep = poor habit formation. Recommendations: consistent sleep/wake times, 7-9 hours, avoid screens before bed. Tell users: "Sleep is when your brain locks in today's progress."`,
    source: 'Neuroscience Research',
    categories: ['neuroscience'],
    keywords: ['sleep', 'memory', 'consolidation', 'rem', 'rest']
  },
  {
    id: 'habit-timeline',
    content: `Habit Formation Timeline: Average time is 66 days, but ranges from 18 to 254 days depending on complexity and consistency. Simple habits form faster. What matters: daily consistency (not sporadic), same context/cue, emotional association through celebration. Missing once won't reset progress, but try not to miss twice.`,
    source: 'Research (Lally et al.)',
    categories: ['habit-formation', 'neuroscience'],
    keywords: ['days', 'time', 'how long', '66', 'timeline', 'duration']
  },

  // Mindset
  {
    id: 'growth-mindset',
    content: `Growth Mindset (Carol Dweck): Believing abilities can be developed through effort vs. fixed mindset (abilities are static). Growth mindset people: embrace challenges, persist through setbacks, see effort as path to mastery, learn from criticism, find inspiration in others' success. Praise effort and process, not innate ability.`,
    source: 'Mindset',
    categories: ['mindset', 'motivation'],
    keywords: ['growth', 'mindset', 'fixed', 'effort', 'learn', 'ability']
  },
  {
    id: 'grit',
    content: `Grit (Angela Duckworth): Passion + Perseverance for long-term goals. Grit predicts success more than talent. Components: Interest (enjoying what you do), Practice (deliberate improvement), Purpose (believing work matters), Hope (persisting despite setbacks). Grit can be developed through experience and environment.`,
    source: 'Grit',
    categories: ['mindset', 'motivation'],
    keywords: ['grit', 'perseverance', 'passion', 'long-term', 'persist']
  },

  // Struggling/Recovery
  {
    id: 'missing-days',
    content: `When users miss days: Missing once doesn't erase progress - neural pathways don't disappear. The "never miss twice" rule: one miss is an accident, two is a new pattern. Don't guilt-trip. Say: "Everyone misses sometimes. What matters is getting back on track today." The Fresh Start Effect: new weeks/months are good restart points.`,
    source: 'Atomic Habits + Research',
    categories: ['struggling', 'motivation'],
    keywords: ['miss', 'skip', 'fail', 'restart', 'recovery', 'back']
  },
  {
    id: 'low-motivation',
    content: `For low motivation: Don't rely on motivation - it's unreliable. Instead: 1) Make the task tinier (2-minute rule), 2) Improve the cue (make it obvious), 3) Add immediate reward, 4) Remember identity ("I am someone who..."). Ask: "What's the smallest version you could do right now?"`,
    source: 'Tiny Habits + Atomic Habits',
    categories: ['struggling', 'motivation'],
    keywords: ['motivation', 'unmotivated', 'don\'t feel like', 'tired', 'lazy']
  },
  {
    id: 'self-compassion',
    content: `Self-Compassion in Habit Change: Beating yourself up reduces motivation and increases likelihood of giving up. Treat yourself like you'd treat a friend who's struggling. Acknowledge difficulty without judgment. Research shows self-compassion leads to better habit adherence than self-criticism.`,
    source: 'Psychology Research',
    categories: ['struggling', 'mindset'],
    keywords: ['compassion', 'kind', 'forgive', 'guilt', 'shame', 'fail']
  },

  // Energy and Timing
  {
    id: 'energy-patterns',
    content: `Energy Patterns for Habits:
- MORNING: High cortisol, peak alertness → challenging/important tasks
- AFTERNOON: Post-lunch dip → routine/easier tasks
- EVENING: Declining willpower → easy habits, reflection
- Morning light exposure (10-30 min) optimizes circadian rhythm and cognitive function.
Match task difficulty to energy level for better success.`,
    source: 'Chronobiology Research',
    categories: ['productivity', 'neuroscience'],
    keywords: ['morning', 'evening', 'energy', 'time', 'when', 'schedule']
  }
];

/**
 * Retrieve relevant knowledge chunks based on user context and query
 */
export function retrieveKnowledge(
  context: UserContext,
  scenario?: 'new-goal' | 'struggling' | 'celebration' | 'weekly-review' | 'general'
): string {
  let relevantChunks: KnowledgeChunk[] = [];
  const scores = new Map<string, number>();

  // Score each chunk based on relevance
  for (const chunk of KNOWLEDGE_BASE) {
    let score = 0;

    // Scenario-based scoring
    if (scenario === 'new-goal') {
      if (chunk.categories.includes('habit-formation')) score += 3;
      if (chunk.categories.includes('beginner')) score += 2;
      if (chunk.id.includes('two-minute') || chunk.id.includes('tiny')) score += 2;
    } else if (scenario === 'struggling') {
      if (chunk.categories.includes('struggling')) score += 4;
      if (chunk.categories.includes('motivation')) score += 2;
      if (chunk.id.includes('compassion') || chunk.id.includes('missing')) score += 3;
    } else if (scenario === 'celebration') {
      if (chunk.categories.includes('celebration')) score += 4;
      if (chunk.id.includes('celebration') || chunk.id.includes('dopamine')) score += 3;
    } else if (scenario === 'weekly-review') {
      if (chunk.categories.includes('mindset')) score += 2;
      if (chunk.id.includes('one-percent') || chunk.id.includes('identity')) score += 3;
    }

    // Skill level scoring
    if (context.skillLevel === 'beginner') {
      if (chunk.categories.includes('beginner')) score += 2;
      if (chunk.id.includes('tiny') || chunk.id.includes('two-minute')) score += 2;
    }

    // Low completion rate
    if (context.completionRate !== undefined && context.completionRate < 50) {
      if (chunk.categories.includes('struggling')) score += 2;
      if (chunk.categories.includes('motivation')) score += 1;
    }

    // Energy pattern matching
    if (context.energyPattern && chunk.id.includes('energy')) {
      score += 2;
    }

    // Store score
    if (score > 0) {
      scores.set(chunk.id, score);
    }
  }

  // Sort by score and take top chunks
  const sortedIds = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id]) => id);

  relevantChunks = KNOWLEDGE_BASE.filter(c => sortedIds.includes(c.id));

  // Format for prompt injection
  if (relevantChunks.length === 0) {
    // Default to core frameworks
    relevantChunks = KNOWLEDGE_BASE.filter(c =>
      c.id === 'four-laws-core' || c.id === 'tiny-habits-core' || c.id === 'sdt-core'
    );
  }

  return formatKnowledgeForPrompt(relevantChunks);
}

/**
 * Format knowledge chunks for injection into LLM prompt
 */
function formatKnowledgeForPrompt(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) return '';

  const formatted = chunks.map(chunk =>
    `[${chunk.source}]\n${chunk.content}`
  ).join('\n\n---\n\n');

  return `SCIENTIFIC KNOWLEDGE BASE:\n\n${formatted}`;
}

/**
 * Get knowledge for specific keywords/topics
 */
export function searchKnowledge(keywords: string[]): string {
  const lowerKeywords = keywords.map(k => k.toLowerCase());

  const matches = KNOWLEDGE_BASE.filter(chunk => {
    const hasKeyword = chunk.keywords.some(k =>
      lowerKeywords.some(lk => k.includes(lk) || lk.includes(k))
    );
    return hasKeyword;
  });

  return formatKnowledgeForPrompt(matches.slice(0, 3));
}

/**
 * Get all knowledge formatted as system context
 */
export function getFullKnowledgeContext(): string {
  const coreChunks = KNOWLEDGE_BASE.filter(c =>
    c.id.includes('core') || c.id.includes('sdt') || c.id.includes('tiny-habits')
  );
  return formatKnowledgeForPrompt(coreChunks);
}

// ─── Async semantic retrieval with static fallback ────────────────────────────
// Import is deferred to avoid circular deps at module init time
import { retrieveKnowledgeSemantic } from './semantic-retriever';

/**
 * Primary retrieval entry point for agents and prompt builders.
 *
 * Semantic path: embed the query via Jina AI → cosine search in Supabase pgvector
 * Fallback path: static keyword scoring (always available, zero latency)
 *
 * The fallback fires automatically when:
 *   - VITE_JINA_API_KEY is not set
 *   - knowledge_chunks table is empty (before first ingestion)
 *   - Supabase returns no matches above the similarity threshold
 *   - Any network error occurs
 */
export async function retrieveKnowledgeWithFallback(
  context: UserContext,
  scenario?: 'new-goal' | 'struggling' | 'celebration' | 'weekly-review' | 'general'
): Promise<string> {
  // Build a compact query string from context + scenario for the embedding
  const parts: string[] = [];
  if (scenario && scenario !== 'general') parts.push(scenario.replace(/-/g, ' '));
  if (context.goal)           parts.push(context.goal);
  if (context.currentStruggle) parts.push(context.currentStruggle);
  if (context.skillLevel)     parts.push(context.skillLevel);
  const query = parts.join('. ');

  if (query.trim()) {
    const semantic = await retrieveKnowledgeSemantic({ query });
    if (semantic) return semantic;
  }

  // Static fallback — always works
  return retrieveKnowledge(context, scenario);
}
