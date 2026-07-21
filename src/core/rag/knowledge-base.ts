/**
 * Coheren RAG - Knowledge Base
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
export interface KnowledgeChunk {
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
  },

  // ── FITNESS ───────────────────────────────────────────────────────────────
  {
    id: 'fitness-progressive-overload',
    content: 'Progressive overload is the single most important principle in fitness: increase training stress by 5–10% each week (more reps, more weight, or shorter rest). Without progressive overload the body adapts and stops improving. Track every session in a log — you cannot manage what you do not measure. Beginners see gains even with random increases; intermediate+ athletes need systematic periodisation.',
    source: 'Sports Science — NSCA Essentials of Strength Training',
    categories: ['habit-formation', 'behavior-change'],
    keywords: ['progressive overload', 'strength', 'weight', 'reps', 'training', 'workout', 'gym', 'fitness', 'muscle', 'gains']
  },
  {
    id: 'fitness-recovery',
    content: 'Muscle growth and fat adaptation happen during rest, not during the workout. The workout is the stimulus; sleep and nutrition are where the adaptation occurs. Skipping rest days accumulates fatigue faster than fitness, leading to injury and burnout. Research shows 48–72 hours recovery between same-muscle sessions is optimal for most people.',
    source: 'Exercise Physiology — McArdle, Katch & Katch',
    categories: ['neuroscience', 'behavior-change'],
    keywords: ['recovery', 'rest day', 'sleep', 'overtraining', 'burnout', 'injury', 'muscle', 'fitness']
  },
  {
    id: 'fitness-habit-anchor',
    content: 'The gym bag by the door is worth more than motivation. Friction-reduction cues — workout clothes laid out the night before, pre-packed bag, same gym time every day — remove the decision that kills most workout habits. Link the gym to an existing anchor (commute, lunch break, wake-up) so it becomes automatic. Research shows environment design predicts gym adherence better than motivation levels.',
    source: 'BJ Fogg — Tiny Habits; Environment Design Research',
    categories: ['habit-formation', 'behavior-change'],
    keywords: ['gym habit', 'workout habit', 'consistency', 'motivation', 'friction', 'environment', 'fitness routine']
  },
  {
    id: 'fitness-plateau',
    content: 'Plateaus in fitness are normal and expected — the body is efficient and adapts to repeated stimuli. Breaking a plateau requires introducing a new variable: deload week (reduce volume 40–50% to let CNS recover), change exercise variation, adjust rep ranges, or add a new modality. Most people quit during plateaus rather than adjusting; those who stay and adjust come back stronger.',
    source: 'Periodisation Theory — Vladimir Zatsiorsky',
    categories: ['mindset', 'struggling'],
    keywords: ['plateau', 'stuck', 'no progress', 'fitness', 'strength', 'deload', 'variation', 'adapt']
  },

  // ── EXAM PREP ─────────────────────────────────────────────────────────────
  {
    id: 'exam-spaced-repetition',
    content: 'Spaced repetition exploits the forgetting curve: reviewing material at increasing intervals (1 day → 3 days → 7 days → 21 days) reduces forgetting by 80% compared to massed study. For competitive exams (UPSC, GRE, GMAT, NEET) spaced repetition via flashcard systems is the highest-ROI study method. Cramming right before an exam produces short-term recall but almost zero retention after 48 hours.',
    source: 'Hermann Ebbinghaus — Forgetting Curve; Piotr Woźniak — SuperMemo research',
    categories: ['neuroscience', 'productivity'],
    keywords: ['spaced repetition', 'flashcards', 'memorise', 'exam', 'UPSC', 'GRE', 'GMAT', 'NEET', 'retain', 'forgetting curve', 'study']
  },
  {
    id: 'exam-active-recall',
    content: 'Active recall — retrieving information from memory rather than re-reading — is 3× more effective for long-term retention. Re-reading and highlighting create an "illusion of knowing." Instead: close the book, write what you remember, then check. Self-testing with past papers, mock exams, and practice questions is the most validated exam preparation method across all competitive exams.',
    source: 'Henry Roediger — Testing Effect; Make It Stick (Brown, Roediger, McDaniel)',
    categories: ['neuroscience', 'behavior-change'],
    keywords: ['active recall', 'self testing', 'past papers', 'mock test', 'exam', 'study', 'UPSC', 'revision', 'retrieval practice']
  },
  {
    id: 'exam-pomodoro',
    content: 'For dense exam material (law, medicine, civil services), the Pomodoro technique — 25 minutes of deep focus followed by a 5-minute break — maintains concentration quality over long study sessions. Longer unbroken sessions (2+ hours) produce diminishing returns as attention degrades. After four Pomodoros take a 20–30 minute break. This structure also prevents the burnout that kills exam prep consistency.',
    source: 'Francesco Cirillo — The Pomodoro Technique; Attention Research',
    categories: ['productivity', 'behavior-change'],
    keywords: ['Pomodoro', 'focus', 'study session', 'exam', 'attention', 'breaks', 'concentration', 'burnout prevention', 'time management']
  },
  {
    id: 'exam-mock-tests',
    content: 'Full-length timed mock tests are non-negotiable for competitive exam success. They build exam stamina, reveal weak topics under pressure, improve time management, and reduce test anxiety through familiarity. Start mocks early — not only after completing the syllabus. Analyse every mistake: categorise errors as knowledge gaps vs careless mistakes, and address them systematically.',
    source: 'Cognitive Load Theory; UPSC Toppers Strategy Research',
    categories: ['behavior-change', 'productivity'],
    keywords: ['mock test', 'practice exam', 'UPSC', 'GRE', 'time management', 'exam strategy', 'weak topics', 'test anxiety', 'full length']
  },

  // ── LEARNING ──────────────────────────────────────────────────────────────
  {
    id: 'learning-deliberate-practice',
    content: 'Deliberate practice (Ericsson) is not the same as just doing something repeatedly. It requires: clear goals at the edge of your ability, immediate feedback, full concentration, and working on weaknesses not strengths. Elite performers spend 4+ hours daily in deliberate practice; casual practitioners spend the same time but in "comfortable repetition." The difference explains the 10,000-hour myth — only deliberate hours count.',
    source: 'K. Anders Ericsson — Peak: Secrets from the New Science of Expertise',
    categories: ['mindset', 'behavior-change'],
    keywords: ['deliberate practice', 'skill', 'expert', 'learning', 'improve', 'mastery', 'feedback', 'weakness']
  },
  {
    id: 'learning-feedback-loops',
    content: 'Fast feedback loops accelerate learning more than any other single variable. Daily micro-tests (write one page, explain to someone, build a small project) produce faster skill growth than weekly reviews of the same material. The quicker the feedback, the faster errors are corrected. Learning programming, language, music, or any skill: build something small every day that forces immediate feedback.',
    source: 'Feedback Loop Research — Carol Dweck; Learning Science',
    categories: ['behavior-change', 'habit-formation'],
    keywords: ['feedback', 'learning', 'daily practice', 'micro project', 'skill', 'coding', 'language', 'music', 'improvement']
  },
  {
    id: 'learning-chunking',
    content: 'Chunking is the process of grouping related pieces of information into a single mental unit, reducing cognitive load. Expert chess players see board positions as meaningful chunks, not individual pieces. When learning any complex skill, identify the core "chunks" (fundamental concepts or patterns) and master them before adding complexity. Trying to learn everything at once overloads working memory and slows acquisition.',
    source: 'George Miller — Working Memory; Chase & Simon — Chunking in Chess',
    categories: ['neuroscience', 'productivity'],
    keywords: ['chunking', 'cognitive load', 'learning', 'memory', 'fundamentals', 'complexity', 'working memory', 'beginner']
  },
  {
    id: 'learning-output-driven',
    content: 'Output-driven learning beats passive consumption. Reading about coding → building a project. Watching guitar tutorials → playing a song. Studying marketing → running a campaign. The act of producing output reveals exactly what you do not know (the "knowledge gap") and forces you to seek targeted answers. Passive consumption (videos, books) creates an illusion of competence without building actual capability.',
    source: 'Richard Feynman Learning Technique; Project-Based Learning Research',
    categories: ['behavior-change', 'mindset'],
    keywords: ['output', 'project', 'build', 'create', 'learning', 'coding', 'guitar', 'Feynman', 'application', 'practice']
  },

  // ── CREATIVE ──────────────────────────────────────────────────────────────
  {
    id: 'creative-quantity-not-quality',
    content: 'A ceramics professor split the class: half were graded on the quantity of pots made, half on the quality of one perfect pot. At the end of the semester, all the best pots came from the quantity group. Making 100 imperfect pots builds skill faster than obsessing over 1 perfect one. For creative work — writing, art, music, design — output volume beats perfection-seeking.',
    source: 'David Bayles & Ted Orland — Art & Fear',
    categories: ['mindset', 'behavior-change'],
    keywords: ['creative', 'quantity', 'perfectionism', 'art', 'writing', 'music', 'output', 'practice', 'ceramics', 'fear of failure']
  },
  {
    id: 'creative-constraints',
    content: 'Constraints spark creativity by eliminating the paralysis of infinite options. Artists given limited colours, poets given strict forms, designers given tight briefs often produce more original work than those given total freedom. Self-impose constraints: write 200 words not 2000, sketch for 5 minutes not an hour, compose one section not the whole piece. Constraints force creative problem-solving.',
    source: 'Patricia Stokes — Creativity from Constraints; Twyla Tharp — The Creative Habit',
    categories: ['mindset', 'productivity'],
    keywords: ['creative', 'constraints', 'creativity', 'writer\'s block', 'art', 'design', 'writing', 'music', 'paralysis', 'inspiration']
  },
  {
    id: 'creative-resistance',
    content: 'Steven Pressfield calls it Resistance: the invisible force that keeps creative people from doing their work. It is strongest just before a breakthrough. The professional shows up every day regardless of inspiration — because inspiration follows action, not the other way around. The amateur waits to feel ready; the professional starts, and readiness follows. Resistance is at its loudest when the work matters most.',
    source: 'Steven Pressfield — The War of Art',
    categories: ['mindset', 'motivation'],
    keywords: ['resistance', 'creative block', 'procrastination', 'creative work', 'art', 'writing', 'music', 'motivation', 'professional', 'showing up']
  },
  {
    id: 'creative-public-accountability',
    content: 'Sharing work-in-progress publicly creates accountability loops that sustain creative habits. "Learning in public" or "building in public" attracts feedback, mentors, and collaborators — and creates mild social pressure to continue. Sharing imperfect work also dismantles perfectionism: once the first imperfect piece is out, the second is easier. Even a small audience (10 followers) produces more consistency than private practice.',
    source: 'Swyx — Learn in Public; Austin Kleon — Show Your Work',
    categories: ['motivation', 'habit-formation'],
    keywords: ['public', 'accountability', 'creative', 'share', 'feedback', 'audience', 'writing', 'art', 'consistency', 'social pressure']
  },

  // ── CAREER ────────────────────────────────────────────────────────────────
  {
    id: 'career-skill-stacking',
    content: 'Scott Adams\'s skill stacking: being in the top 25% at two or three complementary skills is easier than reaching the top 1% in one skill — and more valuable in most careers. Examples: coding + communication = 10× more effective engineer; marketing + data = rare analyst; design + business = product leader. The unique combination, not the individual excellence, is what opens doors.',
    source: 'Scott Adams — How to Fail at Almost Everything and Still Win Big',
    categories: ['mindset', 'productivity'],
    keywords: ['skill stacking', 'career', 'skills', 'complementary', 'unique', 'combination', 'job', 'promotion', 'value']
  },
  {
    id: 'career-proof-of-work',
    content: 'Public proof of work — GitHub commits, published articles, a portfolio of projects — is worth more than any resume. It shows what you can do, not what you say you can do. Build your portfolio during learning, not after: every project from your roadmap is a portfolio piece. Hiring managers and clients trust demonstrated work over claimed experience. Even small public projects outperform zero public evidence.',
    source: 'Patrick McKenzie — Don\'t Call Yourself a Programmer; Proof of Work Research',
    categories: ['behavior-change', 'motivation'],
    keywords: ['portfolio', 'proof of work', 'GitHub', 'career', 'job', 'projects', 'hiring', 'resume', 'credibility']
  },
  {
    id: 'career-network-quality',
    content: 'Mark Granovetter\'s "strength of weak ties": acquaintances open more career doors than close friends, because they operate in different networks and carry novel information. Close friends already know what you know. Investing in 100 weak ties (people you meet once or twice) produces more opportunities than deepening 5 close friendships. Online: commenting thoughtfully on others\' work builds weak ties at scale.',
    source: 'Mark Granovetter — The Strength of Weak Ties',
    categories: ['behavior-change', 'motivation'],
    keywords: ['networking', 'career', 'connections', 'opportunities', 'job', 'weak ties', 'relationships', 'acquaintances']
  },
  {
    id: 'career-learning-publicly',
    content: 'Learning in public accelerates career growth by turning the learning process itself into a credibility signal. Writing about what you are learning — even as a beginner — builds an audience, attracts mentors, and creates a record of growth. The best time to write "I just learned X" is when you learned it. Within 6–12 months of consistent public learning, people arrive at you with opportunities rather than you chasing them.',
    source: 'Swyx (Shawn Wang) — Learn in Public Essay',
    categories: ['motivation', 'habit-formation'],
    keywords: ['learning in public', 'career', 'writing', 'audience', 'credibility', 'Twitter', 'blog', 'mentors', 'opportunities', 'growth']
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

// ─── BM25 retrieval ───────────────────────────────────────────────────────────

export interface BM25Candidate {
  chunk: KnowledgeChunk;
  score: number;
}

const STOP_WORDS = new Set([
  'a','an','and','are','as','at','be','been','being','by','do','for',
  'from','has','have','he','her','his','how','i','in','is','it','its',
  'of','on','or','our','out','s','she','so','some','than','that','the',
  'their','them','there','they','this','to','up','us','was','we','were',
  'what','when','which','who','will','with','you','your',
]);

// Precompute at module load — zero cost at runtime
const N = KNOWLEDGE_BASE.length;
const _avgdl = KNOWLEDGE_BASE.reduce((sum, c) => sum + c.keywords.length, 0) / N;

// IDF per unique keyword token
const _dfMap = new Map<string, number>();
for (const chunk of KNOWLEDGE_BASE) {
  for (const kw of chunk.keywords) {
    for (const token of kw.toLowerCase().split(/\W+/).filter(t => t.length > 1)) {
      _dfMap.set(token, (_dfMap.get(token) ?? 0) + 1);
    }
  }
}
const _idfMap = new Map<string, number>();
for (const [term, df] of _dfMap) {
  _idfMap.set(term, Math.log((N - df + 0.5) / (df + 0.5) + 1));
}

const BM25_K1 = 1.5;
const BM25_B  = 0.75;

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

/**
 * BM25 candidate retrieval over the static knowledge base.
 * Uses chunk.keywords as the document vocabulary (tf = count within keywords list).
 */
export function getBm25Candidates(query: string, topK: number): BM25Candidate[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const results: BM25Candidate[] = [];

  for (const chunk of KNOWLEDGE_BASE) {
    const kwTokens = chunk.keywords.flatMap(kw => tokenize(kw));
    const dl = kwTokens.length;
    if (dl === 0) continue;

    // Build tf map for this chunk
    const tfMap = new Map<string, number>();
    for (const t of kwTokens) tfMap.set(t, (tfMap.get(t) ?? 0) + 1);

    let score = 0;
    for (const qt of queryTokens) {
      const tf  = tfMap.get(qt) ?? 0;
      if (tf === 0) continue;
      const idf = _idfMap.get(qt) ?? 0;
      score += idf * (tf * (BM25_K1 + 1)) / (tf + BM25_K1 * (1 - BM25_B + BM25_B * dl / _avgdl));
    }

    if (score > 0) results.push({ chunk, score });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, topK);
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
 *   - the Jina embedding call fails
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
