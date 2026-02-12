#!/usr/bin/env tsx
/**
 * Agent 1 + Agent 2 Test Suite
 *
 * Tests goal-analyzer and stone-identifier agents against:
 *   - Well-formed realistic goals
 *   - Vague / ambiguous goals
 *   - Unrealistic goals (time/effort mismatch)
 *   - Hybrid domain goals
 *   - Minimal input (edge case: no constraints, no context)
 *   - Extreme edge cases (empty string, nonsense, single word)
 *
 * Run: npx tsx scripts/test-agents.ts
 */

import Groq from 'groq-sdk';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Load .env manually (no dotenv dependency) ────────────────────────────────

function loadEnv(): Record<string, string> {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const raw = readFileSync(envPath, 'utf-8');
    const env: Record<string, string> = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      env[key] = val;
    }
    return env;
  } catch {
    return {};
  }
}

const env = loadEnv();
const GROQ_API_KEY = env.VITE_GROQ_API_KEY ?? process.env.VITE_GROQ_API_KEY ?? '';

if (!GROQ_API_KEY) {
  console.error('❌  VITE_GROQ_API_KEY not found in .env');
  process.exit(1);
}

const groq = new Groq({ apiKey: GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

// ─── Type Definitions (inline to avoid import.meta.env chain) ─────────────────

interface AgentContext {
  userId: string;
  goal: string;
  timeline: number;
  dailyTimeAvailable: number;
}

interface GoalAnalysis {
  goal: string;
  domain: string;
  subDomains: string[];
  category: string;
  horizon: string;
  intensity: string;
  clarityScore: number;
  ambiguityScore: number;
  confidence: number;
  smartStatus: Record<string, boolean>;
  missingSMART: string[];
  realismChecks: { timeRealism: string; effortRealism: string };
  constraintsDetected: string[];
  risksDetected: string[];
  complexity: string;
  typicalTimeline: { minimum: string; realistic: string; mastery: string };
  keyMilestones: string[];
  successCriteria: string[];
  prerequisites: string[];
  commonObstacles: string[];
}

interface StoneProfile {
  userArchetype: string;
  primaryStone: string;
  stones: Array<{
    type: string;
    category: string;
    trigger: string;
    severity: string;
    riskImpact: number;
  }>;
  agent3Guidance: string[];
  agent5Note: string;
  confidence: number;
}

// ─── Stone Taxonomy (from stone-taxonomy.ts — constants only) ──────────────────

const ALL_STONE_TYPES = [
  'TimeConstraint', 'ResourceGap', 'EnvironmentFriction',
  'Inconsistency', 'FearOfFailure', 'Perfectionism', 'LowConfidence', 'UnrealisticExpectations',
  'FocusFragility', 'CognitiveFatigue', 'SkillGap',
  'ProcrastinationPattern', 'Overcommitment',
];

const STONE_DESCRIPTIONS: Record<string, string> = {
  TimeConstraint:          'Not enough consistent time available for meaningful progress',
  ResourceGap:             'Missing equipment, tools, environment, or financial access',
  EnvironmentFriction:     'Physical or social environment makes practice difficult',
  Inconsistency:           'Restart cycles — starts strong, drops off, repeats',
  FearOfFailure:           'Avoidance and hesitation driven by fear of poor outcomes',
  Perfectionism:           'Blocked by the need for conditions to be perfect before starting',
  LowConfidence:           'Self-doubt undermines execution despite having the capability',
  UnrealisticExpectations: 'Fantasy timeline or outcome detached from reality',
  FocusFragility:          'Difficulty maintaining deep focus for sustained periods',
  CognitiveFatigue:        'Mental exhaustion limits learning quality and retention',
  SkillGap:                'Missing foundational knowledge required for the goal',
  ProcrastinationPattern:  'Delay loops — knows what to do but repeatedly postpones',
  Overcommitment:          'Too many parallel goals dilute focus and energy',
};

const STONE_TO_CATEGORY: Record<string, string> = {
  TimeConstraint: 'Logistical', ResourceGap: 'Logistical', EnvironmentFriction: 'Logistical',
  Inconsistency: 'Psychological', FearOfFailure: 'Psychological', Perfectionism: 'Psychological',
  LowConfidence: 'Psychological', UnrealisticExpectations: 'Psychological',
  FocusFragility: 'Cognitive', CognitiveFatigue: 'Cognitive', SkillGap: 'Cognitive',
  ProcrastinationPattern: 'Behavioural', Overcommitment: 'Behavioural',
};

const DOMAIN_GAPS: Record<string, string[]> = {
  Cognitive: ['daily deep-focus capacity', 'prior knowledge level', 'preferred learning format', 'study environment quality', 'distractions and interruptions'],
  Kinesthetic: ['injury history and physical limitations', 'equipment and training space access', 'peak energy window', 'current fitness baseline', 'training partner or solo'],
  Career: ['deadline urgency and stakes', 'current network and resources', 'decision-making authority', 'fallback plan', 'competing obligations'],
  Financial: ['current financial situation', 'risk tolerance', 'existing knowledge of instruments', 'monthly discretionary income', 'liquidity needs'],
  Creative: ['prior creative work', 'tools and software access', 'public vs private output', 'creative blocks', 'feedback environment'],
  Health: ['current health baseline', 'medical constraints', 'support system', 'previous attempts', 'stress factors'],
  Lifestyle: ['current routine structure', 'accountability mechanisms', 'social support', 'competing habits', 'environment design capacity'],
  Hybrid: ['which sub-domain is primary', 'resource allocation', 'conflicting schedule demands', 'prior experience in each domain'],
};

// ─── Agent 1: Goal Analyzer ───────────────────────────────────────────────────

const AGENT1_SYSTEM = `You are Agent 1: Goal Analyzer — a precision intelligence module.

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
- "Hybrid"       → spans multiple domains

## SMART Validation — Strict
- specific: Is the target outcome clearly defined?
- measurable: Can progress be objectively tracked?
- achievable: Is it within plausible human limits?
- relevant: Does it match user context?
- timeBound: Is there a deadline or timeline?

## Realism Checks — Be Conservative
UNREALISTIC: "fluent language in 1 month", "top exam in 6 weeks", "6-pack in 2 weeks"

## Scoring
clarityScore 0.0–1.0: 1.0=perfectly defined, 0.0="be better"
ambiguityScore 0.0–1.0: 0.0=crystal clear, 1.0=contradictory
confidence 0.0–1.0: your confidence in this analysis

Return ONLY valid JSON — no markdown, no explanation.`;

async function runAgent1(context: AgentContext): Promise<GoalAnalysis | null> {
  const userPrompt = `Analyze this goal:

Goal: "${context.goal}"
User's Timeline: ${context.timeline} days
Daily Time Available: ${context.dailyTimeAvailable} minutes

Return a JSON object with this exact schema:
{
  "goalAnalysis": {
    "goal": "normalized goal statement",
    "domain": "Cognitive|Kinesthetic|Career|Financial|Creative|Health|Lifestyle|Hybrid",
    "subDomains": [],
    "category": "specific category",
    "horizon": "Short-term|Mid-term|Long-term",
    "intensity": "Low|Moderate|High|Extreme",
    "clarityScore": 0.0,
    "ambiguityScore": 0.0,
    "confidence": 0.0,
    "smartStatus": { "specific": true, "measurable": true, "achievable": true, "relevant": true, "timeBound": true },
    "missingSMART": [],
    "realismChecks": { "timeRealism": "Realistic|Optimistic|Unrealistic|Unknown", "effortRealism": "Realistic|Optimistic|Unrealistic|Unknown" },
    "constraintsDetected": [],
    "risksDetected": [],
    "complexity": "beginner|intermediate|advanced",
    "typicalTimeline": { "minimum": "X weeks", "realistic": "X-Y months", "mastery": "X-Y years" },
    "keyMilestones": [],
    "successCriteria": [],
    "prerequisites": [],
    "commonObstacles": []
  }
}`;

  try {
    const res = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: AGENT1_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const content = res.choices[0]?.message?.content ?? '';
    const raw = JSON.parse(content) as { goalAnalysis?: GoalAnalysis };
    const g = raw?.goalAnalysis;
    if (!g) return null;

    // Validate + normalize (mirrors validateAndNormalize() in goal-analyzer.ts)
    const validDomains = ['Cognitive', 'Kinesthetic', 'Career', 'Financial', 'Creative', 'Health', 'Lifestyle', 'Hybrid'];
    if (!validDomains.includes(g.domain)) g.domain = 'Cognitive';
    g.clarityScore   = Math.min(1, Math.max(0, g.clarityScore   ?? 0.5));
    g.ambiguityScore = Math.min(1, Math.max(0, g.ambiguityScore ?? 0.5));
    g.confidence     = Math.min(1, Math.max(0, g.confidence     ?? 0.5));
    g.subDomains         ??= [];
    g.missingSMART       ??= [];
    g.constraintsDetected ??= [];
    g.risksDetected      ??= [];
    g.keyMilestones      ??= [];
    g.successCriteria    ??= [];
    g.prerequisites      ??= [];
    g.commonObstacles    ??= [];

    // Sync missingSMART
    if (g.smartStatus) {
      g.missingSMART = (['specific','measurable','achievable','relevant','timeBound'] as const)
        .filter(k => !g.smartStatus[k]);
    }

    return g;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`    Agent 1 error: ${msg}`);
    return null;
  }
}

// ─── Agent 2 Mode 1: Question Generator ───────────────────────────────────────

async function runAgent2Mode1(context: AgentContext, analysis: GoalAnalysis): Promise<unknown[] | null> {
  const stoneList = Object.entries(STONE_DESCRIPTIONS)
    .map(([t, d]) => `- ${t}: ${d}`)
    .join('\n');

  const system = `You are Agent 2: Stone Identifier — Question Generator mode.

Generate 4–6 targeted diagnostic questions that uncover the variables most likely to derail
the user's goal — their "stones."

## Known Stone Types
${stoneList}

## Question Generation Principles
1. Domain-aware: generate questions addressing domain-specific unknowns
2. Personalized: always reference the goal text in each question
3. Question type: prefer multiple_choice (2–4 options) over open_ended
4. Every option MUST explain how it changes the curriculum

Return ONLY valid JSON:
{
  "requiredStones": [
    {
      "stoneId": "unique_snake_case_id",
      "stoneName": "Display Name",
      "importance": "critical|high|medium|low",
      "reasoning": "Why this changes the curriculum",
      "question": {
        "text": "Personalized question",
        "type": "multiple_choice|open_ended|yes_no|scale",
        "options": [
          { "value": "...", "label": "...", "impact": { "curriculum": "...", "modifications": "..." } }
        ]
      }
    }
  ]
}`;

  const g = analysis;
  const domainGaps = DOMAIN_GAPS[g.domain] ?? DOMAIN_GAPS['Lifestyle'];

  const userPrompt = `Generate 4–6 targeted diagnostic questions for this user.

## Goal Analysis
Goal: "${context.goal}"
Domain: ${g.domain}
Horizon: ${g.horizon}
Intensity: ${g.intensity}
Complexity: ${g.complexity}
Constraints Already Detected: ${g.constraintsDetected.join(', ') || 'None'}
Risks Already Detected: ${g.risksDetected.join(', ') || 'None'}

## Critical Variables for ${g.domain} Domain
${domainGaps.map((gap, i) => `${i + 1}. ${gap}`).join('\n')}

## Already Known (DO NOT ASK)
- Goal: "${context.goal}"
- Timeline: ${context.timeline} days
- Daily time: ${context.dailyTimeAvailable} minutes

Generate GOAL-SPECIFIC questions. Every question must reference the goal or related specifics.`;

  try {
    const res = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.35,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    });

    const content = res.choices[0]?.message?.content ?? '';
    const raw = JSON.parse(content) as { requiredStones?: unknown[] };
    const stones = raw?.requiredStones ?? [];
    return Array.isArray(stones) ? stones.slice(0, 6) : [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`    Agent 2 Mode 1 error: ${msg}`);
    return null;
  }
}

// ─── Agent 2 Mode 2: Stone Extractor ─────────────────────────────────────────

async function runAgent2Mode2(
  context: AgentContext,
  analysis: GoalAnalysis,
  answers: Array<{ stoneId: string; answer: string | string[] | number }>
): Promise<StoneProfile | null> {
  const taxonomyList = ALL_STONE_TYPES
    .map(t => `- ${t} (${STONE_TO_CATEGORY[t]}): ${STONE_DESCRIPTIONS[t]}`)
    .join('\n');

  const system = `You are Agent 2: Stone Identifier — Stone Extractor mode.

Analyze the user's answers and extract their behavioral profile — their "stones."

## Stone Taxonomy (ONLY use stones from this list)
${taxonomyList}

## Rules
- ONLY use stone types from the taxonomy
- Pick 2–4 stones maximum
- The primaryStone must be the single highest-risk stone
- severity: Low|Moderate|High|Critical
- riskImpact: 0.0–1.0 (1.0 = will derail goal if not addressed)
- Return ONLY valid JSON`;

  const answersText = answers
    .map(a => `Q (${a.stoneId}): ${typeof a.answer === 'object' ? JSON.stringify(a.answer) : a.answer}`)
    .join('\n');

  const userPrompt = `Extract the stone profile from these answers.

## Goal Context
Goal: "${context.goal}"
Domain: ${analysis.domain}
Intensity: ${analysis.intensity}
Horizon: ${analysis.horizon}
Risks: ${analysis.risksDetected.join(', ') || 'None'}
Constraints: ${analysis.constraintsDetected.join(', ') || 'None'}

## User's Answers
${answersText}

Return JSON:
{
  "stoneProfile": {
    "userArchetype": "short descriptive archetype label",
    "primaryStone": "one StoneType from taxonomy",
    "stones": [
      { "type": "StoneType", "category": "Logistical|Psychological|Cognitive|Behavioural", "trigger": "specific trigger", "severity": "Low|Moderate|High|Critical", "riskImpact": 0.0 }
    ],
    "agent3Guidance": ["instruction 1", "instruction 2"],
    "agent5Note": "predictive note",
    "confidence": 0.0
  }
}`;

  try {
    const res = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    });

    const content = res.choices[0]?.message?.content ?? '';
    const raw = JSON.parse(content) as { stoneProfile?: StoneProfile };
    const p = raw?.stoneProfile;
    if (!p) return null;

    // Validate
    if (!ALL_STONE_TYPES.includes(p.primaryStone)) p.primaryStone = 'Inconsistency';
    p.stones = (p.stones ?? [])
      .filter(s => ALL_STONE_TYPES.includes(s.type))
      .map(s => ({
        ...s,
        category: STONE_TO_CATEGORY[s.type] ?? 'Behavioural',
        riskImpact: Math.min(1, Math.max(0, s.riskImpact ?? 0.5)),
      }))
      .slice(0, 4);
    p.confidence = Math.min(1, Math.max(0, p.confidence ?? 0.6));
    p.userArchetype ??= 'Unknown Archetype';
    p.agent3Guidance ??= [];
    p.agent5Note ??= '';

    return p;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`    Agent 2 Mode 2 error: ${msg}`);
    return null;
  }
}

// ─── Formatting Helpers ───────────────────────────────────────────────────────

function bar(score: number, width = 20): string {
  const filled = Math.round(score * width);
  return '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + ']';
}

function check(val: boolean) { return val ? '✓' : '✗'; }

function printAgent1Result(label: string, g: GoalAnalysis | null, durationMs: number) {
  const pad = '  ';
  if (!g) {
    console.log(`${pad}❌  Agent 1 returned null`);
    return;
  }

  const smartStr = Object.entries(g.smartStatus)
    .map(([k, v]) => `${check(v)}${k.slice(0,2).toUpperCase()}`)
    .join('  ');

  console.log(`${pad}Domain       : ${g.domain}${g.subDomains.length ? ` + [${g.subDomains.join(', ')}]` : ''}`);
  console.log(`${pad}Category     : ${g.category}`);
  console.log(`${pad}Horizon      : ${g.horizon}  |  Intensity: ${g.intensity}  |  Complexity: ${g.complexity}`);
  console.log(`${pad}SMART        : ${smartStr}`);
  if (g.missingSMART.length) {
    console.log(`${pad}Missing SMART: ${g.missingSMART.join(', ')}`);
  }
  console.log(`${pad}Clarity      : ${bar(g.clarityScore)} ${(g.clarityScore * 100).toFixed(0)}%`);
  console.log(`${pad}Ambiguity    : ${bar(g.ambiguityScore)} ${(g.ambiguityScore * 100).toFixed(0)}%`);
  console.log(`${pad}Confidence   : ${bar(g.confidence)} ${(g.confidence * 100).toFixed(0)}%`);
  console.log(`${pad}Time realism : ${g.realismChecks.timeRealism}  |  Effort: ${g.realismChecks.effortRealism}`);
  if (g.constraintsDetected.length) {
    console.log(`${pad}Constraints  : ${g.constraintsDetected.join(' • ')}`);
  }
  if (g.risksDetected.length) {
    console.log(`${pad}Risks        : ${g.risksDetected.join(' • ')}`);
  }
  console.log(`${pad}Timeline     : min=${g.typicalTimeline.minimum} | realistic=${g.typicalTimeline.realistic} | mastery=${g.typicalTimeline.mastery}`);
  console.log(`${pad}Milestones   : ${g.keyMilestones.slice(0,3).join(' → ')}`);
  console.log(`${pad}⏱  ${durationMs}ms`);
}

function printAgent2Mode1Result(stones: unknown[] | null, durationMs: number) {
  if (!stones) {
    console.log('  ❌  Agent 2 Mode 1 returned null');
    return;
  }

  console.log(`  Generated ${stones.length} diagnostic questions:`);
  for (const s of stones as Array<{
    stoneId: string; stoneName: string; importance: string;
    reasoning: string; question: { text: string; type: string; options?: unknown[] }
  }>) {
    console.log(`    [${s.importance.toUpperCase()}] ${s.stoneName} (${s.stoneId})`);
    console.log(`           Q: ${s.question.text.slice(0, 90)}${s.question.text.length > 90 ? '…' : ''}`);
    console.log(`           Type: ${s.question.type}  |  Options: ${s.question.options?.length ?? 0}`);
  }
  console.log(`  ⏱  ${durationMs}ms`);
}

function printAgent2Mode2Result(profile: StoneProfile | null, durationMs: number) {
  if (!profile) {
    console.log('  ❌  Agent 2 Mode 2 returned null');
    return;
  }

  console.log(`  Archetype    : ${profile.userArchetype}`);
  console.log(`  Primary Stone: ${profile.primaryStone} (${STONE_TO_CATEGORY[profile.primaryStone]})`);
  console.log(`  All Stones   :`);
  for (const s of profile.stones) {
    const impact = bar(s.riskImpact, 10);
    console.log(`    • ${s.type.padEnd(25)} ${s.severity.padEnd(10)} ${impact} risk=${s.riskImpact.toFixed(2)}`);
    console.log(`      Trigger: ${s.trigger}`);
  }
  console.log(`  A3 Guidance  :`);
  for (const g of profile.agent3Guidance) {
    console.log(`    → ${g}`);
  }
  console.log(`  A5 Note      : ${profile.agent5Note}`);
  console.log(`  Confidence   : ${bar(profile.confidence)} ${(profile.confidence * 100).toFixed(0)}%`);
  console.log(`  ⏱  ${durationMs}ms`);
}

// ─── Test Cases ────────────────────────────────────────────────────────────────

interface TestCase {
  label: string;
  context: AgentContext;
  testMode2?: boolean;
  simulatedAnswers?: Array<{ stoneId: string; answer: string | string[] | number }>;
  expectDomain?: string;
  expectUnrealistic?: boolean;
  expectLowClarity?: boolean;
  expectMissingSMART?: string[];
}

const TEST_CASES: TestCase[] = [
  // ── CASE 1: Well-formed, realistic goal ─────────────────────────────────────
  {
    label: '1. Well-formed | Learn Python in 6 months (1hr/day)',
    context: {
      userId: 'test-1',
      goal: 'Learn Python programming to an intermediate level — able to build REST APIs and automate data tasks',
      timeline: 180,
      dailyTimeAvailable: 60,
    },
    testMode2: true,
    simulatedAnswers: [
      { stoneId: 'prior_knowledge', answer: 'complete_beginner' },
      { stoneId: 'study_environment', answer: 'home_with_distractions' },
      { stoneId: 'schedule_consistency', answer: 'inconsistent_most_days' },
      { stoneId: 'motivation_pattern', answer: 'strong_start_fades' },
    ],
    expectDomain: 'Cognitive',
  },

  // ── CASE 2: Vague / ambiguous goal ──────────────────────────────────────────
  {
    label: '2. Vague | "Be more productive"',
    context: {
      userId: 'test-2',
      goal: 'Be more productive and improve myself',
      timeline: 90,
      dailyTimeAvailable: 30,
    },
    expectLowClarity: true,
    expectMissingSMART: ['specific', 'measurable'],
  },

  // ── CASE 3: Unrealistic timeline ────────────────────────────────────────────
  {
    label: '3. Unrealistic | Fluent Spanish in 30 days (20 min/day)',
    context: {
      userId: 'test-3',
      goal: 'Become fluent in Spanish and hold natural conversations with native speakers',
      timeline: 30,
      dailyTimeAvailable: 20,
    },
    expectUnrealistic: true,
    expectDomain: 'Cognitive',
  },

  // ── CASE 4: Hybrid domain goal ───────────────────────────────────────────────
  {
    label: '4. Hybrid | Fitness + YouTube channel (90 days, 90 min/day)',
    context: {
      userId: 'test-4',
      goal: 'Get in shape (lose 15kg) while building a fitness YouTube channel with 1000 subscribers in 90 days',
      timeline: 90,
      dailyTimeAvailable: 90,
    },
    testMode2: true,
    simulatedAnswers: [
      { stoneId: 'equipment_access', answer: 'home_no_gym' },
      { stoneId: 'content_experience', answer: 'never_made_videos' },
      { stoneId: 'time_split', answer: 'equal_split_unsure' },
    ],
    expectDomain: 'Hybrid',
  },

  // ── CASE 5: Constraint-heavy goal ────────────────────────────────────────────
  {
    label: '5. Constraint-heavy | UPSC exam while working full-time (only 45 min/day)',
    context: {
      userId: 'test-5',
      goal: 'Clear the UPSC civil services exam (Prelims) while working full-time as a software engineer, with only 45 minutes available per day',
      timeline: 365,
      dailyTimeAvailable: 45,
    },
    testMode2: true,
    simulatedAnswers: [
      { stoneId: 'focus_window', answer: 'mornings_before_work' },
      { stoneId: 'prior_attempt', answer: 'first_attempt_no_prep' },
      { stoneId: 'reading_speed', answer: 'slow_needs_re_reads' },
      { stoneId: 'stress_level', answer: 'high_job_stress' },
    ],
    expectDomain: 'Cognitive',
  },

  // ── CASE 6: Edge case — single-word nonsense input ────────────────────────────
  {
    label: '6. Edge case | Single-word nonsense: "Happiness"',
    context: {
      userId: 'test-edge-1',
      goal: 'Happiness',
      timeline: 60,
      dailyTimeAvailable: 30,
    },
    expectLowClarity: true,
  },

  // ── CASE 7: Edge case — contradictory (extreme goal, minimal time) ────────────
  {
    label: '7. Contradiction | Olympic-level marathon in 60 days with 15 min/day',
    context: {
      userId: 'test-edge-2',
      goal: 'Train for and complete an Olympic marathon qualifying run in 60 days. I am completely sedentary right now.',
      timeline: 60,
      dailyTimeAvailable: 15,
    },
    expectUnrealistic: true,
  },

  // ── CASE 8: Edge case — creative long-term ─────────────────────────────────
  {
    label: '8. Creative | Write and publish a novel in 12 months (45 min/day)',
    context: {
      userId: 'test-8',
      goal: 'Write and self-publish a 80,000-word science fiction novel within 12 months',
      timeline: 365,
      dailyTimeAvailable: 45,
    },
    testMode2: true,
    simulatedAnswers: [
      { stoneId: 'prior_writing', answer: 'blogging_only_no_fiction' },
      { stoneId: 'plot_ready', answer: 'rough_idea_no_outline' },
      { stoneId: 'accountability', answer: 'solo_no_writing_group' },
    ],
    expectDomain: 'Creative',
  },
];

// ─── Scoring & Summary ────────────────────────────────────────────────────────

interface TestResult {
  label: string;
  agent1Pass: boolean;
  agent1DomainCorrect: boolean;
  agent1RealismCorrect: boolean;
  agent1ClarityCorrect: boolean;
  agent1SmartCorrect: boolean;
  agent2Mode1Pass: boolean | null;
  agent2Mode2Pass: boolean | null;
  totalTimeMs: number;
}

// ─── Main Runner ──────────────────────────────────────────────────────────────

async function main() {
  const WIDTH = 80;
  const HR   = '─'.repeat(WIDTH);

  console.log('\n' + '═'.repeat(WIDTH));
  console.log(' COHEREN — AGENT 1 + AGENT 2 TEST SUITE');
  console.log(' Model: ' + MODEL);
  console.log(' Cases: ' + TEST_CASES.length);
  console.log('═'.repeat(WIDTH) + '\n');

  const results: TestResult[] = [];
  let totalPassed = 0;
  let totalChecks = 0;

  for (const tc of TEST_CASES) {
    const result: TestResult = {
      label: tc.label,
      agent1Pass: false,
      agent1DomainCorrect: true,
      agent1RealismCorrect: true,
      agent1ClarityCorrect: true,
      agent1SmartCorrect: true,
      agent2Mode1Pass: null,
      agent2Mode2Pass: null,
      totalTimeMs: 0,
    };

    const startTotal = Date.now();

    console.log(HR);
    console.log(`▶  ${tc.label}`);
    console.log(`   Goal: "${tc.context.goal.slice(0, 70)}${tc.context.goal.length > 70 ? '…' : ''}"`);
    console.log(`   Timeline: ${tc.context.timeline}d  |  Daily: ${tc.context.dailyTimeAvailable}min\n`);

    // ── Agent 1 ───────────────────────────────────────────────────────────────
    console.log('  [AGENT 1: Goal Analyzer]');
    const t1 = Date.now();
    const analysis = await runAgent1(tc.context);
    const d1 = Date.now() - t1;
    printAgent1Result(tc.label, analysis, d1);

    if (analysis) {
      result.agent1Pass = true;

      // Domain check
      if (tc.expectDomain && analysis.domain !== tc.expectDomain) {
        result.agent1DomainCorrect = false;
        console.log(`  ⚠  Domain mismatch: expected "${tc.expectDomain}", got "${analysis.domain}"`);
      }

      // Realism check
      if (tc.expectUnrealistic) {
        const isUnrealistic = analysis.realismChecks.timeRealism === 'Unrealistic' ||
          analysis.realismChecks.effortRealism === 'Unrealistic' ||
          analysis.risksDetected.length > 0;
        if (!isUnrealistic) {
          result.agent1RealismCorrect = false;
          console.log(`  ⚠  Expected unrealistic flags but got: time=${analysis.realismChecks.timeRealism}, effort=${analysis.realismChecks.effortRealism}`);
        } else {
          console.log(`  ✓  Correctly flagged as unrealistic`);
        }
      }

      // Clarity check
      if (tc.expectLowClarity && analysis.clarityScore > 0.6) {
        result.agent1ClarityCorrect = false;
        console.log(`  ⚠  Expected low clarity but got clarityScore=${analysis.clarityScore.toFixed(2)}`);
      } else if (tc.expectLowClarity) {
        console.log(`  ✓  Correctly identified low clarity (score=${analysis.clarityScore.toFixed(2)})`);
      }

      // missingSMART check
      if (tc.expectMissingSMART) {
        const missing = tc.expectMissingSMART.every(m => analysis.missingSMART.includes(m));
        if (!missing) {
          result.agent1SmartCorrect = false;
          console.log(`  ⚠  Expected missing SMART: ${tc.expectMissingSMART.join(', ')} — got: ${analysis.missingSMART.join(', ') || 'none'}`);
        } else {
          console.log(`  ✓  Correctly identified missing SMART elements`);
        }
      }
    }

    // ── Agent 2 Mode 1 ────────────────────────────────────────────────────────
    if (tc.testMode2 && analysis) {
      console.log('\n  [AGENT 2 MODE 1: Question Generator]');
      const t2a = Date.now();
      const questions = await runAgent2Mode1(tc.context, analysis);
      const d2a = Date.now() - t2a;
      printAgent2Mode1Result(questions, d2a);
      result.agent2Mode1Pass = questions !== null && questions.length >= 3;

      if (questions && questions.length < 3) {
        console.log(`  ⚠  Only ${questions.length} questions generated (expected 4–6)`);
      }
    }

    // ── Agent 2 Mode 2 ────────────────────────────────────────────────────────
    if (tc.testMode2 && analysis && tc.simulatedAnswers) {
      console.log('\n  [AGENT 2 MODE 2: Stone Extractor]');
      const t2b = Date.now();
      const profile = await runAgent2Mode2(tc.context, analysis, tc.simulatedAnswers);
      const d2b = Date.now() - t2b;
      printAgent2Mode2Result(profile, d2b);
      result.agent2Mode2Pass = profile !== null && profile.stones.length >= 1;

      if (profile && profile.stones.length === 0) {
        console.log(`  ⚠  No valid stones extracted after taxonomy validation`);
      }
    }

    result.totalTimeMs = Date.now() - startTotal;

    // Pass/fail per case
    const checks = [
      result.agent1Pass,
      result.agent1DomainCorrect,
      result.agent1RealismCorrect,
      result.agent1ClarityCorrect,
      result.agent1SmartCorrect,
      ...(result.agent2Mode1Pass !== null ? [result.agent2Mode1Pass] : []),
      ...(result.agent2Mode2Pass !== null ? [result.agent2Mode2Pass] : []),
    ];
    const passed = checks.filter(Boolean).length;
    totalPassed += passed;
    totalChecks += checks.length;

    console.log(`\n  CASE RESULT: ${passed}/${checks.length} checks passed | Total: ${result.totalTimeMs}ms`);
    results.push(result);
    console.log();
  }

  // ─── Final Summary ──────────────────────────────────────────────────────────

  console.log('═'.repeat(WIDTH));
  console.log(' SUMMARY');
  console.log('═'.repeat(WIDTH));

  const pct = ((totalPassed / totalChecks) * 100).toFixed(0);
  console.log(`\n  Total checks : ${totalPassed}/${totalChecks} passed (${pct}%)\n`);

  const tableHeader = '  Case'.padEnd(55) + 'A1   A2Q  A2S  ms';
  console.log(tableHeader);
  console.log('  ' + '─'.repeat(WIDTH - 2));

  for (const r of results) {
    const a1  = r.agent1Pass ? '✓' : '✗';
    const a2q = r.agent2Mode1Pass === null ? '-' : r.agent2Mode1Pass ? '✓' : '✗';
    const a2s = r.agent2Mode2Pass === null ? '-' : r.agent2Mode2Pass ? '✓' : '✗';
    const label = r.label.slice(0, 50).padEnd(52);
    console.log(`  ${label} ${a1}    ${a2q}    ${a2s}    ${r.totalTimeMs}`);
  }

  console.log('\n' + '═'.repeat(WIDTH));

  // Robustness notes
  console.log('\n  ROBUSTNESS NOTES:');
  const a1Passes = results.filter(r => r.agent1Pass).length;
  const a2q1Passes = results.filter(r => r.agent2Mode1Pass === true).length;
  const a2q1Total  = results.filter(r => r.agent2Mode1Pass !== null).length;
  const a2s1Passes = results.filter(r => r.agent2Mode2Pass === true).length;
  const a2s1Total  = results.filter(r => r.agent2Mode2Pass !== null).length;

  console.log(`  • Agent 1  : ${a1Passes}/${results.length} returned valid output`);
  if (a2q1Total > 0) console.log(`  • Agent 2 Mode 1 : ${a2q1Passes}/${a2q1Total} generated 3+ questions`);
  if (a2s1Total > 0) console.log(`  • Agent 2 Mode 2 : ${a2s1Passes}/${a2s1Total} extracted valid stone profiles`);

  const domainErrors   = results.filter(r => !r.agent1DomainCorrect).length;
  const realismErrors  = results.filter(r => !r.agent1RealismCorrect).length;
  const clarityErrors  = results.filter(r => !r.agent1ClarityCorrect).length;
  const smartErrors    = results.filter(r => !r.agent1SmartCorrect).length;

  if (domainErrors)  console.log(`  ⚠  Domain misclassifications: ${domainErrors}`);
  if (realismErrors) console.log(`  ⚠  Missed unrealistic flags: ${realismErrors}`);
  if (clarityErrors) console.log(`  ⚠  Clarity scoring issues: ${clarityErrors}`);
  if (smartErrors)   console.log(`  ⚠  SMART detection issues: ${smartErrors}`);

  const totalTime = results.reduce((s, r) => s + r.totalTimeMs, 0);
  console.log(`\n  Total wall time: ${(totalTime / 1000).toFixed(1)}s`);
  console.log('═'.repeat(WIDTH) + '\n');

  process.exit(totalPassed === totalChecks ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
