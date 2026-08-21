/**
 * Agent 1: Goal Analyzer
 *
 * Responsibilities:
 *   - Transform unstructured human intention into structured goal metadata
 *   - Classify domain + category with diagnostic branching
 *   - SMART validation with shadow self-check
 *   - Clarity & ambiguity scoring
 *   - Realism assessment (time + effort) — conservative bias
 *   - Hidden constraint detection
 *   - Risk flagging
 *   - Confidence scoring
 *
 * Rules:
 *   - Returns structured JSON only — no advice, no motivation
 *   - Conservative on realism (better to under-promise)
 *   - Powers everything downstream — must be accurate
 */

import type { Agent1Output, AgentContext, GoalClarificationOutput } from '@types-app/agents';
import { callReasoning, callWithTools } from '@lib/ai-router';
import type { ToolSchema } from '@lib/ai-router';
import { flags } from '@config/feature-flags';
import { assessFeasibility } from './feasibility';
import { parseAgentJSON } from './llm-output';
import { agent1GoalAnalysisSchema, safeValidate } from './schemas';

const SYSTEM_PROMPT = `You are Agent 1: Goal Analyzer — a precision intelligence module.

Your sole job is to transform a human's stated goal into machine-usable structured metadata.

## Domain Classification
Classify into exactly one primary domain:
- "Cognitive"    → learning, exams, programming, languages, studying, research
- "Kinesthetic"  → sports, fitness, martial arts, dance, physical skills
- "Career"       → job search, promotion, business, entrepreneurship, freelancing
- "Financial"    → saving, investing, income, debt, net worth
- "Creative"     → writing, music, art, video, design, content creation
- "Health"       → mental health, sleep, nutrition, medical recovery
- "Lifestyle"    → habits, routines, relationships, travel, productivity
- "Hybrid"       → spans multiple domains (e.g. "fitness YouTuber" = Kinesthetic + Creative)

## Horizon Classification
- "Short-term"   → under 3 months
- "Mid-term"     → 3 months to 1 year
- "Long-term"    → over 1 year

## Intensity Classification
- "Low"      → 15-30 min/day
- "Moderate" → 30-60 min/day
- "High"     → 60-120 min/day
- "Extreme"  → 2+ hours/day

## SMART Validation — Strict
- specific:    Is the target outcome clearly defined (what, to what level)?
- measurable:  Can progress be objectively tracked or quantified?
- achievable:  Is it within plausible human limits given timeline and effort?
- relevant:    Does it match the user's apparent context and life stage?
- timeBound:   Is there a deadline, horizon, or timeline stated or implied?

## Realism Checks — Be Conservative
UNREALISTIC time: "fluent language in 1 month", "top exam in 6 weeks", "6-pack in 2 weeks"
OPTIMISTIC time: "run a marathon in 2 months (beginner)", "build a startup in 3 months"
UNREALISTIC effort: "world-class with casual practice", "get ripped without diet changes"

## Constraint Detection
Extract from phrases like: "while working full-time", "as a student", "no equipment",
"only 20 minutes a day", "I've never done X before"

## Risk Detection — Flag any of:
- Burnout risk (extreme intensity + long timeline)
- Vague fantasy (no concrete measurable outcome)
- Over-ambition (goal scope >> stated timeline)
- Conflicting priorities (multiple incompatible goals)
- Experience gap (advanced goal with zero background)

## Goal Type Classification
Classify the goal into exactly one of four types that determines the curriculum structure:
- "skill_based"     → There is a known, teachable curriculum for this goal.
                      Examples: learn Python, play guitar, speak French, run a marathon, learn boxing.
                      Indicator: the goal names a specific learnable skill with established pedagogy.
- "behavior_based"  → No standard curriculum exists. The goal is about changing a pattern of behavior.
                      Examples: be more disciplined, stop procrastinating, build a morning routine,
                      become more consistent, improve focus, be less reactive.
                      Indicator: the goal is an abstract character/trait change with no skill syllabus.
- "outcome_based"   → A defined endpoint with a flexible path. The skill required is secondary.
                      Examples: lose 10kg, earn $5000/month, get promoted, publish a book.
                      Indicator: goal is an outcome metric, not a skill or behavior.
- "hybrid"          → Requires BOTH skill acquisition AND behavior change.
                      Examples: get fit AND track nutrition, launch a business AND build discipline,
                      learn to code AND build the habit of shipping daily.

When in doubt between behavior_based and outcome_based: if there is no natural curriculum and success
depends primarily on repeating a new behavior pattern, use "behavior_based".

## Scoring
clarityScore 0.0–1.0: 1.0=perfectly defined, 0.5=partially defined, 0.0="be better"
ambiguityScore 0.0–1.0: 0.0=crystal clear, 1.0=contradictory/undecipherable
confidence 0.0–1.0: Your confidence this analysis is accurate given available information

## Rules
- Return ONLY valid JSON — no markdown, no explanation, no commentary
- Be analytical and precise, never motivational
- Never hallucinate context not present in the input`;

function buildUserPrompt(context: AgentContext): string {
  return `Analyze this goal:

Goal: "${context.goal}"
User's Timeline: ${context.timeline} days
Daily Time Available: ${context.dailyTimeAvailable} minutes

Return a JSON object with this exact schema:
{
  "goalAnalysis": {
    "goal": "normalized goal statement",
    "domain": "Cognitive|Kinesthetic|Career|Financial|Creative|Health|Lifestyle|Hybrid",
    "subDomains": ["additional domain if Hybrid, else empty array"],
    "category": "specific category within domain",
    "horizon": "Short-term|Mid-term|Long-term",
    "intensity": "Low|Moderate|High|Extreme",
    "clarityScore": 0.0,
    "ambiguityScore": 0.0,
    "confidence": 0.0,
    "smartStatus": {
      "specific": true,
      "measurable": true,
      "achievable": true,
      "relevant": true,
      "timeBound": true
    },
    "missingSMART": ["specific|measurable|achievable|relevant|timeBound"],
    "realismChecks": {
      "timeRealism": "Realistic|Optimistic|Unrealistic|Unknown",
      "effortRealism": "Realistic|Optimistic|Unrealistic|Unknown"
    },
    "constraintsDetected": [],
    "risksDetected": [],
    "complexity": "beginner|intermediate|advanced",
    "goalType": "skill_based|behavior_based|outcome_based|hybrid",
    "learningTypes": ["physical|cognitive|creative|social|mental"],
    "typicalTimeline": {
      "minimum": "X weeks",
      "realistic": "X-Y months",
      "mastery": "X-Y years"
    },
    "keyMilestones": ["milestone 1", "milestone 2"],
    "successCriteria": ["criteria 1", "criteria 2"],
    "prerequisites": ["prereq 1"],
    "commonObstacles": ["obstacle 1", "obstacle 2"]
  }
}`;
}

/**
 * Domain keyword override map — catches common misclassifications by LLM.
 * Keys: lowercase keyword fragments that appear in goals.
 * Values: correct domain classification.
 */
const DOMAIN_KEYWORD_OVERRIDES: Record<string, string> = {
  // Financial
  'invest': 'Financial', 'stock': 'Financial', 'crypto': 'Financial',
  'budget': 'Financial', 'saving': 'Financial', 'debt': 'Financial',
  'net worth': 'Financial', 'passive income': 'Financial', 'retire': 'Financial',
  // Career
  'promotion': 'Career', 'job search': 'Career', 'resume': 'Career',
  'freelanc': 'Career', 'side hustle': 'Career', 'startup': 'Career',
  'business': 'Career', 'interview': 'Career',
  // Kinesthetic
  'marathon': 'Kinesthetic', 'pull-up': 'Kinesthetic', 'push-up': 'Kinesthetic',
  'bench press': 'Kinesthetic', 'deadlift': 'Kinesthetic', 'squat': 'Kinesthetic',
  'run a': 'Kinesthetic', 'swim': 'Kinesthetic', 'martial art': 'Kinesthetic',
  // Health
  'anxiety': 'Health', 'depression': 'Health', 'sleep': 'Health',
  'therapy': 'Health', 'weight loss': 'Health', 'mental health': 'Health',
  // Creative
  'novel': 'Creative', 'album': 'Creative', 'paint': 'Creative',
  'youtube': 'Creative', 'podcast': 'Creative', 'film': 'Creative',
};

function detectDomainOverride(goalText: string): string | null {
  const lower = goalText.toLowerCase();
  for (const [keyword, domain] of Object.entries(DOMAIN_KEYWORD_OVERRIDES)) {
    if (lower.includes(keyword)) return domain;
  }
  return null;
}

// Keywords that strongly indicate a behavior_based goal (no pre-built curriculum)
const BEHAVIOR_BASED_KEYWORDS = [
  'more disciplin', 'be disciplin', 'more consistent', 'be consistent',
  'stop procrastinat', 'procrastinat', 'better focus', 'improve focus',
  'morning routine', 'daily routine', 'build a routine', 'better habits',
  'less reactive', 'be more productive', 'improve productiv',
  'stop being lazy', 'be more motivated', 'build motivation',
  'better work ethic', 'be more organized', 'better time management',
  'build self-discipline', 'build willpower', 'be more confident',
];

// Keywords that strongly indicate an outcome_based goal (metric endpoint)
const OUTCOME_BASED_KEYWORDS = [
  'lose weight', 'lose.*kg', 'lose.*lbs', 'lose.*pounds',
  'earn.*month', 'make.*month', 'save.*dollars', 'save.*month',
  'get promoted', 'get a job', 'get hired', 'land a job',
  'publish', 'launch', 'ship', 'release', 'build and launch',
];

function detectGoalType(goalText: string): import('@types-app/agents').GoalType | null {
  const lower = goalText.toLowerCase();

  // Check behavior_based first (these are most likely to be misclassified)
  for (const kw of BEHAVIOR_BASED_KEYWORDS) {
    if (new RegExp(kw).test(lower)) return 'behavior_based';
  }

  // Check outcome_based
  for (const kw of OUTCOME_BASED_KEYWORDS) {
    if (new RegExp(kw).test(lower)) return 'outcome_based';
  }

  return null; // Let the LLM decide
}

function validateAndNormalize(raw: unknown, goalText?: string): Agent1Output {
  // Boundary contract — logs drift, does not throw (coercion below covers the failure path).
  safeValidate(agent1GoalAnalysisSchema, raw, 'agent1-goal-analysis');

  const parsed = raw as Agent1Output;
  const g = parsed?.goalAnalysis;

  if (!g || typeof g !== 'object') {
    throw new Error('Agent 1: Missing goalAnalysis in response');
  }

  // Enforce valid domain
  const validDomains = ['Cognitive', 'Kinesthetic', 'Career', 'Financial', 'Creative', 'Health', 'Lifestyle', 'Hybrid'];
  if (!validDomains.includes(g.domain)) g.domain = 'Cognitive';

  // Apply keyword override — catches common LLM misclassifications
  if (goalText) {
    const override = detectDomainOverride(goalText);
    if (override && override !== g.domain) {
      g.domain = override as import('@types-app/agents').GoalDomain;
    }
  }

  // Enforce valid horizon
  const validHorizons = ['Short-term', 'Mid-term', 'Long-term'];
  if (!validHorizons.includes(g.horizon)) g.horizon = 'Mid-term';

  // Enforce valid intensity
  const validIntensities = ['Low', 'Moderate', 'High', 'Extreme'];
  if (!validIntensities.includes(g.intensity)) g.intensity = 'Moderate';

  // Clamp scores to [0, 1]
  g.clarityScore = Math.min(1, Math.max(0, g.clarityScore ?? 0.5));
  g.ambiguityScore = Math.min(1, Math.max(0, g.ambiguityScore ?? 0.5));
  g.confidence = Math.min(1, Math.max(0, g.confidence ?? 0.5));

  // Ensure arrays
  g.subDomains ??= [];
  g.missingSMART ??= [];
  g.constraintsDetected ??= [];
  g.risksDetected ??= [];
  g.keyMilestones ??= [];
  g.successCriteria ??= [];
  g.prerequisites ??= [];
  g.commonObstacles ??= [];
  g.learningTypes ??= [];

  // Ensure smartStatus
  g.smartStatus ??= { specific: false, measurable: false, achievable: true, relevant: true, timeBound: false };

  // Sync missingSMART from smartStatus (source of truth)
  const smartKeys = ['specific', 'measurable', 'achievable', 'relevant', 'timeBound'] as const;
  g.missingSMART = smartKeys.filter(k => !g.smartStatus[k]);

  // Ensure realismChecks
  const validRealism = ['Realistic', 'Optimistic', 'Unrealistic', 'Unknown'];
  g.realismChecks ??= { timeRealism: 'Unknown', effortRealism: 'Unknown' };
  if (!validRealism.includes(g.realismChecks.timeRealism)) g.realismChecks.timeRealism = 'Unknown';
  if (!validRealism.includes(g.realismChecks.effortRealism)) g.realismChecks.effortRealism = 'Unknown';

  // Ensure typicalTimeline
  g.typicalTimeline ??= { minimum: 'Unknown', realistic: 'Unknown', mastery: 'Unknown' };

  // Ensure complexity
  const validComplexity = ['beginner', 'intermediate', 'advanced'];
  if (!validComplexity.includes(g.complexity)) g.complexity = 'beginner';

  // Validate goalType — apply deterministic keyword override first, then validate LLM value
  const validGoalTypes = ['skill_based', 'behavior_based', 'outcome_based', 'hybrid'];
  if (goalText) {
    const override = detectGoalType(goalText);
    if (override) g.goalType = override;
  }
  if (!g.goalType || !validGoalTypes.includes(g.goalType)) {
    // Default: Lifestyle/Health behavior-based goals default to behavior_based;
    // everything else defaults to skill_based
    g.goalType = (g.domain === 'Lifestyle' || g.domain === 'Health') ? 'behavior_based' : 'skill_based';
  }

  return parsed;
}

/**
 * Generate clarifying questions when Agent 1 detects ambiguity or unrealistic goals.
 * Returns needsClarification=false if the goal is already clear enough.
 *
 * Triggered when: confidence < 0.7 OR ambiguityScore > 0.4 OR realism is Unrealistic.
 */
export function buildClarifications(analysis: Agent1Output): GoalClarificationOutput {
  const g = analysis.goalAnalysis;
  const needsClarification = g.confidence < 0.7 || g.ambiguityScore > 0.4;
  const realismUnrealistic =
    g.realismChecks.timeRealism === 'Unrealistic' ||
    g.realismChecks.effortRealism === 'Unrealistic';

  // Build reality check if timeline/effort is flagged as unrealistic.
  // When the deterministic feasibility anchor is present, lead with its real numbers
  // (hours you have vs hours typically needed) + a concrete rescope, instead of the
  // soft LLM "typical timeline" sentence.
  const fa = g.feasibility;
  const realityCheck = realismUnrealistic
    ? {
        triggered: true,
        severity: 'warning' as const,
        headline:
          g.realismChecks.timeRealism === 'Unrealistic'
            ? 'Your timeline looks very aggressive'
            : 'The effort required may exceed your current plan',
        detail: fa
          ? `At this pace you'll have ~${fa.availableHours}h before your deadline. Basic competence in ${fa.skillLabel} usually takes ~${fa.requiredHours}h — about ${Math.max(1, Math.round(fa.requiredHours / Math.max(1, fa.availableHours)))}× more than you've allowed.`
          : `Based on typical progress for ${g.category}, ${g.typicalTimeline.realistic} is usually needed. Your plan targets ${g.horizon.toLowerCase()}.`,
        suggestedAdjustment: fa?.rescopedGoalSuggestion
          ? `A realistic first target: ${fa.rescopedGoalSuggestion}. We'll build toward that and expand once it's in reach.`
          : `We'll focus on solid fundamentals first and adjust milestones so you see real progress every week.`,
        typicalTimeline: g.typicalTimeline.realistic,
      }
    : null;

  if (!needsClarification) {
    return { needsClarification: false, questions: [], realityCheck };
  }

  // Build targeted clarifying questions based on what's ambiguous
  const questions: GoalClarificationOutput['questions'] = [];

  // 1. Goal specificity — what does this actually mean to the user?
  if (g.ambiguityScore > 0.4 || !g.smartStatus.specific) {
    questions.push({
      id: 'goal_specificity',
      question: `What does "${g.category}" mean to you specifically?`,
      type: 'multiple_choice',
      probes: 'specific',
      options: buildSpecificityOptions(g.domain, g.category),
    });
  }

  // 2. Skill level (if missing or unclear)
  if (!g.smartStatus.measurable && g.complexity === 'beginner') {
    questions.push({
      id: 'prior_experience',
      question: `Have you tried ${g.category} before?`,
      type: 'multiple_choice',
      probes: 'complexity',
      options: [
        { value: 'never', label: 'No — complete beginner' },
        { value: 'tried', label: 'Tried a few times, got basics' },
        { value: 'some', label: 'Some experience, want to improve' },
        { value: 'experienced', label: 'Experienced, looking to advance' },
      ],
    });
  }

  // 3. Primary motivation — affects stone detection
  if (g.ambiguityScore > 0.5) {
    questions.push({
      id: 'primary_motivation',
      question: "What's driving you to work on this right now?",
      type: 'multiple_choice',
      probes: 'motivation',
      options: [
        { value: 'personal_growth', label: 'Personal growth / challenge myself' },
        { value: 'career', label: 'Career or income improvement' },
        { value: 'health', label: 'Health or wellbeing' },
        { value: 'social', label: 'Social or relationship reason' },
        { value: 'passion', label: 'Pure passion / always wanted to' },
      ],
    });
  }

  return {
    needsClarification: questions.length > 0,
    questions: questions.slice(0, 3), // max 3
    realityCheck,
  };
}

/** Domain-aware specificity options so questions feel tailored. */
function buildSpecificityOptions(
  domain: string,
  category: string
): GoalClarificationOutput['questions'][0]['options'] {
  const cat = category.toLowerCase();

  if (cat.includes('boxing') || cat.includes('martial')) {
    return [
      { value: 'fitness', label: 'Fitness & cardio through boxing' },
      { value: 'self_defense', label: 'Self-defense basics' },
      { value: 'technique', label: 'Technique & form (bags, shadowboxing)' },
      { value: 'competition', label: 'Competitive sparring or amateur bouts' },
    ];
  }
  if (cat.includes('guitar') || cat.includes('music')) {
    return [
      { value: 'casual', label: 'Play songs for fun / personal enjoyment' },
      { value: 'songs', label: 'Learn specific songs I love' },
      { value: 'theory', label: 'Music theory & technique fundamentals' },
      { value: 'perform', label: 'Perform or record music' },
    ];
  }
  if (cat.includes('coding') || cat.includes('programming') || cat.includes('software')) {
    return [
      { value: 'job', label: 'Get a job as a developer' },
      { value: 'project', label: 'Build a specific project or app' },
      { value: 'freelance', label: 'Freelance / side income' },
      { value: 'skills', label: 'Improve existing coding skills' },
    ];
  }
  if (domain === 'Financial') {
    return [
      { value: 'save', label: 'Build savings / emergency fund' },
      { value: 'invest', label: 'Start investing (stocks, index funds)' },
      { value: 'debt', label: 'Pay off debt' },
      { value: 'income', label: 'Increase income' },
    ];
  }
  if (domain === 'Career') {
    return [
      { value: 'new_job', label: 'Land a new job' },
      { value: 'promotion', label: 'Get promoted in current role' },
      { value: 'skills', label: 'Build skills for career growth' },
      { value: 'business', label: 'Start a business or freelance' },
    ];
  }
  // Generic fallback
  return [
    { value: 'beginner_fundamentals', label: 'Learn the fundamentals from scratch' },
    { value: 'intermediate_improve', label: 'Improve my existing skills' },
    { value: 'specific_outcome', label: 'Achieve a specific measurable outcome' },
    { value: 'habit', label: 'Make it a consistent habit in my life' },
  ];
}

const ANALYZE_GOAL_TOOL: ToolSchema = {
  type: 'function',
  function: {
    name: 'analyze_goal',
    description: 'Transform a human goal statement into structured goal metadata.',
    parameters: {
      type: 'object',
      properties: {
        goalAnalysis: {
          type: 'object',
          properties: {
            goal:           { type: 'string' },
            domain:         { type: 'string', enum: ['Cognitive', 'Kinesthetic', 'Career', 'Financial', 'Creative', 'Health', 'Lifestyle', 'Hybrid'] },
            subDomains:     { type: 'array', items: { type: 'string' } },
            category:       { type: 'string' },
            horizon:        { type: 'string', enum: ['Short-term', 'Mid-term', 'Long-term'] },
            intensity:      { type: 'string', enum: ['Low', 'Moderate', 'High', 'Extreme'] },
            clarityScore:   { type: 'number', minimum: 0, maximum: 1 },
            ambiguityScore: { type: 'number', minimum: 0, maximum: 1 },
            confidence:     { type: 'number', minimum: 0, maximum: 1 },
            smartStatus: {
              type: 'object',
              properties: {
                specific:    { type: 'boolean' },
                measurable:  { type: 'boolean' },
                achievable:  { type: 'boolean' },
                relevant:    { type: 'boolean' },
                timeBound:   { type: 'boolean' },
              },
              required: ['specific', 'measurable', 'achievable', 'relevant', 'timeBound'],
            },
            missingSMART:       { type: 'array', items: { type: 'string' } },
            realismChecks: {
              type: 'object',
              properties: {
                timeRealism:   { type: 'string', enum: ['Realistic', 'Optimistic', 'Unrealistic', 'Unknown'] },
                effortRealism: { type: 'string', enum: ['Realistic', 'Optimistic', 'Unrealistic', 'Unknown'] },
              },
              required: ['timeRealism', 'effortRealism'],
            },
            constraintsDetected: { type: 'array', items: { type: 'string' } },
            risksDetected:       { type: 'array', items: { type: 'string' } },
            complexity:          { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
            learningTypes:       { type: 'array', items: { type: 'string' } },
            typicalTimeline: {
              type: 'object',
              properties: {
                minimum:  { type: 'string' },
                realistic: { type: 'string' },
                mastery:  { type: 'string' },
              },
              required: ['minimum', 'realistic', 'mastery'],
            },
            keyMilestones:    { type: 'array', items: { type: 'string' } },
            successCriteria:  { type: 'array', items: { type: 'string' } },
            prerequisites:    { type: 'array', items: { type: 'string' } },
            commonObstacles:  { type: 'array', items: { type: 'string' } },
          },
          required: ['goal', 'domain', 'category', 'horizon', 'intensity', 'clarityScore', 'ambiguityScore', 'confidence', 'smartStatus', 'realismChecks'],
        },
      },
      required: ['goalAnalysis'],
    },
  },
};

export async function analyzeGoal(context: AgentContext): Promise<Agent1Output> {
  const callMessages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    { role: 'user'   as const, content: buildUserPrompt(context) },
  ];

  let raw: unknown;
  if (flags.USE_TOOL_CALLING) {
    const args = await callWithTools(
      { messages: callMessages, temperature: 0.2, max_tokens: 1500, tools: [ANALYZE_GOAL_TOOL], tool_name: 'analyze_goal' },
      'reasoning'
    );
    raw = parseAgentJSON(args, 'agent1-tool');
  } else {
    const { content } = await callReasoning({
      messages: callMessages,
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });
    if (!content) throw new Error('Agent 1: No response received from model');
    raw = parseAgentJSON(content, 'agent1-reasoning');
  }

  const output = validateAndNormalize(raw, context.goal);
  return applyFeasibilityAnchor(output, context);
}

/**
 * Overlay a deterministic time-to-competence anchor on the LLM's realism opinion.
 *
 * The LLM's `timeRealism` is a mood at temperature 0.2; this computes hours available
 * (days × minutes) vs a coarse hours-to-competence anchor and can only *tighten* the
 * verdict, never loosen it — if the math says the timeline is a fantasy, we force
 * `timeRealism='Unrealistic'` regardless of what the model said, and attach the real
 * numbers + a concrete rescope so the onboarding reality-check can show them.
 */
function applyFeasibilityAnchor(output: Agent1Output, context: AgentContext): Agent1Output {
  const g = output.goalAnalysis;
  const feasibility = assessFeasibility({
    goalText: context.goal,
    timelineDays: context.timeline,
    dailyMinutes: context.dailyTimeAvailable,
  });
  g.feasibility = feasibility;

  // The anchor can only make the verdict stricter, never softer.
  if (feasibility.verdict === 'unrealistic') {
    g.realismChecks.timeRealism = 'Unrealistic';
  } else if (feasibility.verdict === 'tight' && g.realismChecks.timeRealism === 'Realistic') {
    g.realismChecks.timeRealism = 'Optimistic';
  }

  return output;
}
