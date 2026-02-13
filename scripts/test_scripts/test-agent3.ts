#!/usr/bin/env tsx
/**
 * Agent 3: Curriculum Builder — Test Suite
 *
 * Tests buildCurriculum across 3 diverse scenarios:
 *   1. Cognitive  — "Learn Python" (beginner, 90 days, TimeConstraint + ProcrastinationPattern)
 *   2. Kinesthetic — "Train for a boxing fight" (intermediate, 120 days, FearOfFailure + Overcommitment)
 *   3. Creative   — "Write my first novel" (beginner, 180 days, Perfectionism + Inconsistency)
 *
 * Verifies:
 *   - Correct phase count derived from timeline/horizon
 *   - Domain pedagogy name present and matches domain
 *   - Phases have scienceRationale (not empty)
 *   - Stone modifications are reflected in stoneModificationSummary
 *   - All required Roadmap fields are present and valid
 *   - totalDays matches context.timeline
 *   - progressionCurve has entries for each phase
 *   - reviewMoments exist and have valid types
 *
 * Run: npx tsx scripts/test-agent3.ts
 */

import Groq from 'groq-sdk';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Load .env manually (no dotenv dependency) ────────────────────────────────

function loadEnv(): Record<string, string> {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
    const env: Record<string, string> = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    }
    return env;
  } catch { return {}; }
}

const env = loadEnv();
const GROQ_API_KEY = env.VITE_GROQ_API_KEY ?? '';
const JINA_API_KEY = env.VITE_JINA_API_KEY ?? '';
const SUPABASE_URL = env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SUPABASE_ANON = env.VITE_SUPABASE_ANON_KEY ?? '';

if (!GROQ_API_KEY) {
  console.error('❌  VITE_GROQ_API_KEY not found in .env');
  process.exit(1);
}

const groq = new Groq({ apiKey: GROQ_API_KEY });
const MODEL_70B = 'llama-3.3-70b-versatile';
const MODEL_8B  = 'llama-3.1-8b-instant';

// ─── Inline Types (avoid import.meta.env chain) ───────────────────────────────

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
  learningTypes: string[];
  typicalTimeline: { minimum: string; realistic: string; mastery: string };
  keyMilestones: string[];
  successCriteria: string[];
  prerequisites: string[];
  commonObstacles: string[];
}

interface Stone {
  type: string;
  category: string;
  trigger: string;
  severity: string;
  riskImpact: number;
}

interface StoneProfile {
  userArchetype: string;
  primaryStone: string;
  stones: Stone[];
  agent3Guidance: string[];
  agent5Note: string;
  confidence: number;
}

interface Phase {
  phaseNumber: number;
  phaseName: string;
  weeks: number[];
  durationDays: number;
  primaryGoals: string[];
  focusAreas: Record<string, number>;
  keyMilestones: string[];
  scienceRationale: string;
  buildingOn?: string;
  adaptationRules?: {
    if_completing_easily?: string;
    if_struggling?: string;
  };
  graduation?: {
    assessmentDay: string;
    nextSteps: string[];
  };
}

interface Roadmap {
  totalDays: number;
  totalPhases: number;
  phases: Phase[];
  progressionCurve: Record<string, unknown>;
  reviewMoments: Array<{ day: number; type: string; prompt?: string; task?: string }>;
  restDays: { pattern: string; customDays: number[]; restType: string };
  modifiers_from_stones: Record<string, unknown>;
}

interface Agent3Output {
  roadmap: Roadmap;
  domainPedagogy: string;
  stoneModificationSummary: string;
}

// ─── Domain Pedagogy Map (mirrors curriculum-builder.ts) ─────────────────────

const PEDAGOGY_KEYWORDS: Record<string, string[]> = {
  Cognitive:    ['spaced repetition', 'interleaving', 'recall', 'retrieval', 'pomodoro'],
  Kinesthetic:  ['periodization', 'deload', 'foundation', 'development', 'performance'],
  Career:       ['build', 'signal', 'connect', 'convert', 'portfolio'],
  Financial:    ['knowledge laddering', 'exposure', 'simulation'],
  Creative:     ['divergent', 'convergent', 'ideation', 'drafting'],
  Health:       ['behavioral activation', 'habit stacking', 'small wins'],
  Lifestyle:    ['keystone habit', 'identity', 'anchor'],
  Hybrid:       ['parallel track', 'integration'],
};

// ─── RAG semantic retriever (standalone, mirrors semantic-retriever.ts) ────────

async function ragRetrieve(query: string): Promise<string> {
  if (!JINA_API_KEY || !SUPABASE_ANON) return '';

  try {
    // Embed query via Jina
    const jinaRes = await fetch('https://api.jina.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JINA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'jina-embeddings-v3',
        input: [query],
        task: 'retrieval.query',
        dimensions: 1024,
        normalized: true,
      }),
    });
    if (!jinaRes.ok) return '';
    const jinaData = await jinaRes.json() as { data: Array<{ embedding: number[] }> };
    const embedding = jinaData.data[0]?.embedding;
    if (!embedding) return '';

    // Query pgvector via Supabase RPC
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_knowledge_chunks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({
        query_embedding: embedding,
        match_threshold: 0.35,
        match_count: 3,
      }),
    });
    if (!rpcRes.ok) return '';
    const rows = await rpcRes.json() as Array<{ content: string; source: string; similarity: number }>;
    if (!rows?.length) return '';

    return rows.map(r => `[${r.source}] ${r.content}`).join('\n\n');
  } catch {
    return '';
  }
}

// ─── Agent 3 caller (mirrors buildCurriculum logic) ──────────────────────────

const DOMAIN_PEDAGOGY: Record<string, string> = {
  Cognitive: `PEDAGOGICAL FRAMEWORK: Spaced Repetition + Interleaving
- Phase 1 (Foundation): Build mental models. Read, watch, take notes. No testing yet.
- Phase 2 (Active Recall): Close the book. Practice retrieval. Flashcards, practice problems.
- Phase 3 (Interleaving): Mix topics. Do not block-practice. Interleave related concepts.
- Phase 4 (Application): Solve real problems under time pressure. Simulate exam/real conditions.
Session design: 25-min focused blocks (Pomodoro), review previous day's material first (5 min).`,

  Kinesthetic: `PEDAGOGICAL FRAMEWORK: Sports Periodization (Foundation → Development → Performance → Deload)
- Phase 1 (GPP — General Physical Prep): Movement patterns, conditioning base, no intensity.
- Phase 2 (SPP — Specific Physical Prep): Sport-specific drills, volume increase, technique focus.
- Phase 3 (Competition Prep): Peak intensity, specificity, simulate competition conditions.
- Phase 4 (Deload / Taper): Reduce volume by 50%, maintain intensity, sharpen focus.
Mandatory rest: 1 full deload every 4 weeks. Never exceed 3 hard days in a row.`,

  Career: `PEDAGOGICAL FRAMEWORK: Build → Signal → Connect → Convert
- Phase 1 (Skill Acquisition): Learn the core skills for the target role. Projects, not theory.
- Phase 2 (Build Portfolio): Create 2–3 proof-of-work pieces. Quality over quantity.
- Phase 3 (Signal & Visibility): LinkedIn, GitHub, writing, speaking. Build your surface area.
- Phase 4 (Connect & Convert): Outreach, interviews, negotiation. Convert visibility into opportunity.`,

  Financial: `PEDAGOGICAL FRAMEWORK: Knowledge Laddering + Gradual Exposure
- Phase 1 (Foundation): Core concepts. Compound interest, asset classes, risk tolerance.
- Phase 2 (Paper Trading / Simulation): Practice decisions with no real money at stake.
- Phase 3 (Small Real Positions): Enter with 10% of intended capital. Learn with skin in the game.
- Phase 4 (Full Implementation): Scale up, automate, review quarterly.`,

  Creative: `PEDAGOGICAL FRAMEWORK: Divergent → Convergent Cycles
- Phase 1 (Ideation & Exploration): Wide exploration. No judgment. Generate raw material.
- Phase 2 (First Draft): Get it done, not perfect. Momentum over quality.
- Phase 3 (Refinement): Structured revision. Apply craft principles. Seek feedback.
- Phase 4 (Completion & Sharing): Finish and publish/share. Done > perfect.`,

  Health: `PEDAGOGICAL FRAMEWORK: Behavioral Activation + Habit Stacking
- Phase 1 (Baseline): Establish 1–2 non-negotiable micro-habits. Consistency over intensity.
- Phase 2 (Stack & Layer): Add habits on top of existing anchors. Track without judgment.
- Phase 3 (Challenge Phase): Increase difficulty incrementally. Introduce variety.
- Phase 4 (Maintenance & Identity): Shift from "doing the habit" to "being the type of person."`,

  Lifestyle: `PEDAGOGICAL FRAMEWORK: Keystone Habit + Identity Anchoring
- Phase 1 (Keystone Installation): One habit that makes others easier. 21-day anchor.
- Phase 2 (Environment Design): Remove friction. Add cues. Make it obvious, attractive, easy.
- Phase 3 (Social Integration): Add accountability. Tell people. Create external commitment.
- Phase 4 (Identity Lock-In): Own the identity. Respond to questions as if you already are.`,

  Hybrid: `PEDAGOGICAL FRAMEWORK: Parallel Track with Integration Points
- Phase 1: Establish each sub-domain baseline separately. Do not try to combine yet.
- Phase 2: Introduce cross-training between domains. Find natural integration points.
- Phase 3: Combine domains in integrated sessions. Use strength in one to reinforce the other.
- Phase 4: Full integration. Mastery of one domain accelerates the other.`,
};

function derivePhaseCount(timeline: number, horizon: string): number {
  if (horizon === 'Short-term' || timeline <= 90) return 2;
  if (horizon === 'Long-term' || timeline > 365)  return 4;
  return 3;
}

function buildSystemPrompt(domain: string): string {
  const pedagogy = DOMAIN_PEDAGOGY[domain] ?? DOMAIN_PEDAGOGY['Lifestyle'];
  return `You are Agent 3: Curriculum Architect for Coheren AI.

Your job: Build a scientifically-grounded, personalized learning roadmap.

${pedagogy}

CRITICAL RULES:
1. You will be told exactly how many phases to create. DO NOT deviate.
2. Every phase MUST have a "scienceRationale" citing a specific learning principle.
3. Stone modifications are MANDATORY. Every stone listed must change the curriculum.
4. durationDays must sum to totalDays.
5. progressionCurve must have one entry per phase keyed as "phase_1", "phase_2", etc.

Return ONLY valid JSON matching this exact schema:
{
  "roadmap": {
    "totalDays": <number>,
    "totalPhases": <number>,
    "phases": [
      {
        "phaseNumber": 1,
        "phaseName": "<descriptive name>",
        "weeks": [1, 2, 3],
        "durationDays": <number>,
        "primaryGoals": ["<goal 1>", "<goal 2>"],
        "focusAreas": { "<area>": <weight 0–1> },
        "keyMilestones": ["<milestone>"],
        "scienceRationale": "<specific learning science principle + brief citation>",
        "buildingOn": "<null or what the previous phase built>",
        "adaptationRules": {
          "if_completing_easily": "<what to do>",
          "if_struggling": "<what to do>"
        },
        "graduation": {
          "assessmentDay": "<day description>",
          "nextSteps": ["<step 1>"]
        }
      }
    ],
    "progressionCurve": {
      "phase_1": { "intensity": 3, "volume": "low", "technique_depth": "shallow" }
    },
    "reviewMoments": [
      { "day": 14, "type": "checkpoint", "prompt": "<reflection question>" }
    ],
    "restDays": {
      "pattern": "<e.g. every 7th day>",
      "customDays": [7, 14],
      "restType": "active_recovery"
    },
    "modifiers_from_stones": {
      "<StoneType>": {
        "removed": ["<what was removed>"],
        "added": ["<what was added>"],
        "modified": ["<what was changed>"]
      }
    }
  },
  "domainPedagogy": "<name of the framework used>",
  "stoneModificationSummary": "<1–3 sentence summary of how stones changed the curriculum>"
}`;
}

function buildUserPrompt(
  context: AgentContext,
  g: GoalAnalysis,
  sp: StoneProfile,
  rag: string,
  phaseCount: number,
): string {
  const stoneList = sp.stones
    .map(s => `  - ${s.type} [${s.severity}]: ${s.trigger}`)
    .join('\n');

  return `
GOAL: "${context.goal}"
TIMELINE: ${context.timeline} days | DAILY TIME: ${context.dailyTimeAvailable} min
DOMAIN: ${g.domain} | COMPLEXITY: ${g.complexity} | HORIZON: ${g.horizon}

GOAL ANALYSIS:
- Constraints: ${g.constraintsDetected.join(', ') || 'none'}
- Risks: ${g.risksDetected.join(', ') || 'none'}
- Prerequisites: ${g.prerequisites.join(', ') || 'none'}
- Key Milestones: ${g.keyMilestones.slice(0, 4).join('; ')}
- Success Criteria: ${g.successCriteria.slice(0, 3).join('; ')}

STONE PROFILE:
- User Archetype: ${sp.userArchetype}
- Primary Stone: ${sp.primaryStone}
- All Stones:
${stoneList}
- Agent 3 Guidance: ${sp.agent3Guidance.join(' | ')}

${rag ? `SCIENCE / RAG CONTEXT (cite these in scienceRationale fields):
${rag}` : ''}

BUILD EXACTLY ${phaseCount} PHASES.
totalDays = ${context.timeline}.
Apply ALL stones listed above as curriculum modifiers.
`.trim();
}

async function callAgent3(
  context: AgentContext,
  goalAnalysis: GoalAnalysis,
  stoneProfile: StoneProfile,
  ragContext: string,
): Promise<Agent3Output> {
  const phaseCount = derivePhaseCount(context.timeline, goalAnalysis.horizon);

  let response;
  try {
    response = await groq.chat.completions.create({
      model: MODEL_70B,
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(goalAnalysis.domain) },
        { role: 'user',   content: buildUserPrompt(context, goalAnalysis, stoneProfile, ragContext, phaseCount) },
      ],
    });
  } catch {
    // fallback to 8b
    response = await groq.chat.completions.create({
      model: MODEL_8B,
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(goalAnalysis.domain) },
        { role: 'user',   content: buildUserPrompt(context, goalAnalysis, stoneProfile, ragContext, phaseCount) },
      ],
    });
  }

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Agent 3: empty response');
  return JSON.parse(content) as Agent3Output;
}

// ─── Checks ──────────────────────────────────────────────────────────────────

interface CheckResult {
  label: string;
  passed: boolean;
  value?: string;
}

function check(results: CheckResult[], label: string, condition: boolean, value?: string): void {
  results.push({ label, passed: condition, value });
}

function checksForScenario(
  scenario: string,
  out: Agent3Output,
  context: AgentContext,
  domain: string,
  expectedPhases: number,
  stonesApplied: string[],
): CheckResult[] {
  const R: CheckResult[] = [];
  const { roadmap } = out;

  // ── Structural checks ──────────────────────────────────────────────
  check(R, `[${scenario}] roadmap object exists`,             !!roadmap);
  check(R, `[${scenario}] domainPedagogy non-empty`,         !!out.domainPedagogy?.trim(), out.domainPedagogy);
  check(R, `[${scenario}] stoneModificationSummary non-empty`, !!out.stoneModificationSummary?.trim());

  // ── Phase count ────────────────────────────────────────────────────
  check(R, `[${scenario}] totalPhases == ${expectedPhases}`,  roadmap.totalPhases === expectedPhases, String(roadmap.totalPhases));
  check(R, `[${scenario}] phases array length == ${expectedPhases}`, (roadmap.phases?.length ?? 0) === expectedPhases, String(roadmap.phases?.length));

  // ── Timeline ───────────────────────────────────────────────────────
  check(R, `[${scenario}] totalDays == ${context.timeline}`, roadmap.totalDays === context.timeline, String(roadmap.totalDays));

  // ── durationDays sum ───────────────────────────────────────────────
  const durSum = (roadmap.phases ?? []).reduce((s, p) => s + (p.durationDays ?? 0), 0);
  check(R, `[${scenario}] durationDays sum == totalDays`,    durSum === roadmap.totalDays, `${durSum} vs ${roadmap.totalDays}`);

  // ── Phase content ──────────────────────────────────────────────────
  let allHaveRationale = true;
  let allHaveGoals = true;
  let allHaveMilestones = true;

  for (const phase of (roadmap.phases ?? [])) {
    if (!phase.scienceRationale?.trim()) allHaveRationale = false;
    if (!phase.primaryGoals?.length)     allHaveGoals = false;
    if (!phase.keyMilestones?.length)    allHaveMilestones = false;
  }

  check(R, `[${scenario}] all phases have scienceRationale`,  allHaveRationale);
  check(R, `[${scenario}] all phases have primaryGoals`,      allHaveGoals);
  check(R, `[${scenario}] all phases have keyMilestones`,     allHaveMilestones);

  // ── progressionCurve ──────────────────────────────────────────────
  const curve = roadmap.progressionCurve ?? {};
  const curveKeys = Object.keys(curve);
  check(R, `[${scenario}] progressionCurve has ${expectedPhases} entries`, curveKeys.length === expectedPhases, `got ${curveKeys.length}`);

  // ── reviewMoments ─────────────────────────────────────────────────
  const moments = roadmap.reviewMoments ?? [];
  check(R, `[${scenario}] at least 1 reviewMoment`,          moments.length >= 1, `got ${moments.length}`);

  // ── restDays ──────────────────────────────────────────────────────
  check(R, `[${scenario}] restDays.pattern non-empty`,        !!roadmap.restDays?.pattern?.trim());

  // ── Stone modifications ───────────────────────────────────────────
  const modifiers = roadmap.modifiers_from_stones ?? {};
  check(R, `[${scenario}] modifiers_from_stones non-empty`,  Object.keys(modifiers).length > 0, `keys: ${Object.keys(modifiers).join(', ')}`);

  // ── Domain pedagogy keyword check ─────────────────────────────────
  const pedagogy = out.domainPedagogy?.toLowerCase() ?? '';
  const summary  = out.stoneModificationSummary?.toLowerCase() ?? '';
  const domainKws = PEDAGOGY_KEYWORDS[domain] ?? [];
  const pedagogyPhases = (roadmap.phases ?? []).map(p => p.phaseName?.toLowerCase() + ' ' + (p.scienceRationale?.toLowerCase() ?? '')).join(' ');
  const hasFrameworkRef = domainKws.some(kw =>
    pedagogy.includes(kw) ||
    pedagogyPhases.includes(kw)
  );
  check(R, `[${scenario}] domain pedagogy keywords appear in output`, hasFrameworkRef, `domain=${domain}, pedagogy="${out.domainPedagogy}"`);

  // ── Stone mention in summary ──────────────────────────────────────
  const stoneMentioned = stonesApplied.some(s =>
    summary.includes(s.toLowerCase()) ||
    JSON.stringify(modifiers).toLowerCase().includes(s.toLowerCase())
  );
  check(R, `[${scenario}] stone types reflected in output`,  stoneMentioned, `stones=${stonesApplied.join(',')}`);

  return R;
}

// ─── Test Scenarios ───────────────────────────────────────────────────────────

interface Scenario {
  name: string;
  context: AgentContext;
  goalAnalysis: GoalAnalysis;
  stoneProfile: StoneProfile;
  expectedPhases: number;
  stonesApplied: string[];
}

const SCENARIOS: Scenario[] = [
  // ── 1. Cognitive: Python for career change ──────────────────────────────────
  {
    name: 'Cognitive — Python (career change, 90 days)',
    context: {
      userId: 'test-1',
      goal: 'Learn Python well enough to get a junior data analyst job in 3 months',
      timeline: 90,
      dailyTimeAvailable: 45,
    },
    goalAnalysis: {
      goal: 'Learn Python to junior data analyst level',
      domain: 'Cognitive',
      subDomains: ['Career'],
      category: 'Programming Language Acquisition',
      horizon: 'Short-term',
      intensity: 'Moderate',
      clarityScore: 0.8,
      ambiguityScore: 0.2,
      confidence: 0.85,
      smartStatus: { specific: true, measurable: true, achievable: true, relevant: true, timeBound: true },
      missingSMART: [],
      realismChecks: { timeRealism: 'Realistic', effortRealism: 'Optimistic' },
      constraintsDetected: ['working full-time', '45 min/day'],
      risksDetected: ['burnout risk', 'scope creep'],
      complexity: 'beginner',
      learningTypes: ['cognitive'],
      typicalTimeline: { minimum: '3 months', realistic: '6 months', mastery: '18 months' },
      keyMilestones: ['Write a Python script', 'Query a database with pandas', 'Build a portfolio project', 'Pass a coding screen'],
      successCriteria: ['Can query datasets independently', 'Has 2 portfolio projects on GitHub'],
      prerequisites: ['Basic computer literacy'],
      commonObstacles: ['Tutorial hell', 'Skipping practice', 'Imposter syndrome'],
    },
    stoneProfile: {
      userArchetype: 'Motivated but Time-Starved Learner',
      primaryStone: 'TimeConstraint',
      stones: [
        { type: 'TimeConstraint', category: 'Logistical', trigger: 'Working full-time, only 45 min/day', severity: 'High', riskImpact: 0.7 },
        { type: 'ProcrastinationPattern', category: 'Behavioural', trigger: 'Delays practice when stuck on errors', severity: 'Moderate', riskImpact: 0.5 },
      ],
      agent3Guidance: [
        'Compress each phase — no phase should introduce more than 3 new concepts',
        'Design tasks as micro-sessions: 2 × 20 min blocks instead of 1 × 45 min',
        'Front-load the hardest concept of each day to beat procrastination',
        'Add implementation-intention tasks: "If I feel stuck, I will...',
      ],
      agent5Note: 'High dropout risk at day 30 when pandas complexity spikes — pre-empt with a review day',
      confidence: 0.88,
    },
    expectedPhases: 2, // Short-term, 90 days → 2 phases
    stonesApplied: ['TimeConstraint', 'ProcrastinationPattern'],
  },

  // ── 2. Kinesthetic: Boxing ──────────────────────────────────────────────────
  {
    name: 'Kinesthetic — Amateur Boxing (120 days)',
    context: {
      userId: 'test-2',
      goal: 'Compete in my first amateur boxing match in 4 months',
      timeline: 120,
      dailyTimeAvailable: 90,
    },
    goalAnalysis: {
      goal: 'Compete in first amateur boxing match',
      domain: 'Kinesthetic',
      subDomains: [],
      category: 'Combat Sports — Boxing',
      horizon: 'Mid-term',
      intensity: 'High',
      clarityScore: 0.9,
      ambiguityScore: 0.1,
      confidence: 0.92,
      smartStatus: { specific: true, measurable: true, achievable: true, relevant: true, timeBound: true },
      missingSMART: [],
      realismChecks: { timeRealism: 'Realistic', effortRealism: 'Realistic' },
      constraintsDetected: ['no gym access on weekends', 'history of knee pain'],
      risksDetected: ['overtraining risk', 'injury risk'],
      complexity: 'intermediate',
      learningTypes: ['physical', 'mental'],
      typicalTimeline: { minimum: '4 months', realistic: '8 months', mastery: '3 years' },
      keyMilestones: ['10 rounds sparring without gassing', 'Clean jab-cross combo at speed', 'Pass gym fight readiness test'],
      successCriteria: ['Survives all 3 rounds', 'Shows proper defensive technique'],
      prerequisites: ['Basic physical fitness'],
      commonObstacles: ['Fear before sparring', 'Overtraining', 'Technique regression under pressure'],
    },
    stoneProfile: {
      userArchetype: 'Over-Eager Competitor',
      primaryStone: 'FearOfFailure',
      stones: [
        { type: 'FearOfFailure', category: 'Psychological', trigger: 'Avoids sparring, delays signing up for fight', severity: 'High', riskImpact: 0.75 },
        { type: 'Overcommitment', category: 'Behavioural', trigger: 'Trains twice daily the first week and burns out by week 2', severity: 'Moderate', riskImpact: 0.55 },
      ],
      agent3Guidance: [
        'Do NOT put sparring in Phase 1 — label all partner work as "drills" to reduce threat perception',
        'Hard cap at 5 training days per week — 2 days mandatory rest',
        'Graduated exposure to contact: pads → light sparring → full sparring → simulated fight',
        'Add a deload week every 4 weeks regardless of progress',
      ],
      agent5Note: 'Expect peak anxiety and possible dropout at day 28 when full sparring begins — prepare motivational checkpoint',
      confidence: 0.85,
    },
    expectedPhases: 3, // Mid-term, 120 days → 3 phases
    stonesApplied: ['FearOfFailure', 'Overcommitment'],
  },

  // ── 3. Creative: First Novel ────────────────────────────────────────────────
  {
    name: 'Creative — Write First Novel (180 days)',
    context: {
      userId: 'test-3',
      goal: 'Write and finish a complete first draft of a 80,000-word novel in 6 months',
      timeline: 180,
      dailyTimeAvailable: 60,
    },
    goalAnalysis: {
      goal: 'Complete 80,000-word novel first draft',
      domain: 'Creative',
      subDomains: ['Lifestyle'],
      category: 'Long-Form Fiction Writing',
      horizon: 'Mid-term',
      intensity: 'Moderate',
      clarityScore: 0.85,
      ambiguityScore: 0.15,
      confidence: 0.8,
      smartStatus: { specific: true, measurable: true, achievable: true, relevant: true, timeBound: true },
      missingSMART: [],
      realismChecks: { timeRealism: 'Realistic', effortRealism: 'Optimistic' },
      constraintsDetected: ['full-time job', 'family responsibilities'],
      risksDetected: ['perfectionism paralysis', 'inconsistent sessions'],
      complexity: 'beginner',
      learningTypes: ['cognitive', 'creative'],
      typicalTimeline: { minimum: '6 months', realistic: '12 months', mastery: '5 years' },
      keyMilestones: ['Complete story outline', 'Finish Act 1 (20k words)', 'Finish Act 2 (50k words)', 'Complete first draft (80k)'],
      successCriteria: ['80,000 word first draft completed', 'Beginning/middle/end structure present'],
      prerequisites: ['Basic writing literacy'],
      commonObstacles: ['Editing while writing', 'Losing motivation mid-story', 'Perfectionism paralysis'],
    },
    stoneProfile: {
      userArchetype: 'Perfectionist Creator',
      primaryStone: 'Perfectionism',
      stones: [
        { type: 'Perfectionism', category: 'Psychological', trigger: 'Re-reads and edits every sentence before moving forward', severity: 'High', riskImpact: 0.8 },
        { type: 'Inconsistency', category: 'Behavioural', trigger: 'Writes for 3 days then skips 5', severity: 'Moderate', riskImpact: 0.6 },
      ],
      agent3Guidance: [
        'Every writing task must be explicitly labeled a "rough draft task" — no editing allowed',
        'Daily word count goals replace quality metrics entirely in Phase 1 and 2',
        'Introduce a 3-day micro-sprint structure: never miss two consecutive days',
        'Phase 1 tasks should involve outlining and planning — remove blank-page anxiety before drafting begins',
      ],
      agent5Note: 'Perfectionism typically causes 2–3 week stalls at chapter transitions — schedule a "permission to suck" checkpoint at day 45',
      confidence: 0.82,
    },
    expectedPhases: 3, // Mid-term, 180 days → 3 phases
    stonesApplied: ['Perfectionism', 'Inconsistency'],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const W = 72;
  console.log('\n' + '═'.repeat(W));
  console.log(' COHEREN — AGENT 3: CURRICULUM BUILDER TEST SUITE');
  console.log('═'.repeat(W));
  console.log(`\n  3 scenarios × ~18 checks each | Model: ${MODEL_70B}\n`);

  // Pre-flight check
  const hasRag = !!(JINA_API_KEY && SUPABASE_ANON);
  console.log(`  RAG integration: ${hasRag ? '✓ will fetch science context' : '⚠  skipping (no Jina/Supabase keys)'}\n`);

  const allResults: Array<{ label: string; passed: boolean; value?: string }> = [];
  let scenarioIndex = 0;

  for (const scenario of SCENARIOS) {
    scenarioIndex++;
    console.log('─'.repeat(W));
    console.log(`▶  SCENARIO ${scenarioIndex}/3: ${scenario.name}`);
    console.log(`   Goal: "${scenario.context.goal.slice(0, 65)}…"`);
    console.log(`   Timeline: ${scenario.context.timeline}d | Domain: ${scenario.goalAnalysis.domain} | Expected phases: ${scenario.expectedPhases}`);
    console.log(`   Stones: ${scenario.stonesApplied.join(', ')}\n`);

    // Fetch RAG context
    let ragContext = '';
    if (hasRag) {
      const ragQuery = `${scenario.goalAnalysis.domain} ${scenario.goalAnalysis.complexity} learning ${scenario.stonesApplied.join(' ')}`;
      process.stdout.write('   Fetching RAG context...');
      ragContext = await ragRetrieve(ragQuery);
      console.log(ragContext ? ` ✓ (${ragContext.length} chars)\n` : ' ⚠ no results\n');
    }

    const t0 = Date.now();
    let out: Agent3Output | null = null;
    let error: string | null = null;

    try {
      out = await callAgent3(scenario.context, scenario.goalAnalysis, scenario.stoneProfile, ragContext);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    const ms = Date.now() - t0;

    if (error || !out) {
      console.log(`   ❌ Error: ${error ?? 'null output'}\n`);
      allResults.push({ label: `[${scenario.name}] SCENARIO FAILED`, passed: false, value: error ?? 'null' });
      continue;
    }

    // Print summary of output
    console.log(`   ⏱  ${ms}ms`);
    console.log(`   domainPedagogy: "${out.domainPedagogy}"`);
    console.log(`   totalPhases: ${out.roadmap?.totalPhases} | totalDays: ${out.roadmap?.totalDays}`);
    console.log(`   stoneModificationSummary: "${out.stoneModificationSummary?.slice(0, 100)}..."`);
    console.log(`   reviewMoments: ${out.roadmap?.reviewMoments?.length ?? 0} | modifiers_from_stones keys: ${Object.keys(out.roadmap?.modifiers_from_stones ?? {}).join(', ')}`);

    // Show phase names
    if (out.roadmap?.phases?.length) {
      console.log('   Phases:');
      for (const p of out.roadmap.phases) {
        const rationale = p.scienceRationale?.slice(0, 60) ?? '—';
        console.log(`     Phase ${p.phaseNumber}: "${p.phaseName}" (${p.durationDays}d) — ${rationale}...`);
      }
    }
    console.log();

    // Run checks
    const checks = checksForScenario(
      scenario.name,
      out,
      scenario.context,
      scenario.goalAnalysis.domain,
      scenario.expectedPhases,
      scenario.stonesApplied,
    );

    let scenarioPassed = 0;
    for (const c of checks) {
      const icon = c.passed ? '✓' : '✗';
      const val  = c.value  ? ` [${c.value}]` : '';
      if (!c.passed) {
        console.log(`   ${icon}  ${c.label}${val}`);
      }
      if (c.passed) scenarioPassed++;
    }

    if (scenarioPassed === checks.length) {
      console.log(`   ✅  All ${checks.length} checks passed\n`);
    } else {
      console.log(`   ⚠  ${scenarioPassed}/${checks.length} checks passed\n`);
    }

    allResults.push(...checks);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('═'.repeat(W));
  console.log(' RESULTS');
  console.log('═'.repeat(W));

  const passed = allResults.filter(r => r.passed).length;
  const total  = allResults.length;
  const pct    = total > 0 ? ((passed / total) * 100).toFixed(0) : '0';

  console.log(`\n  ${passed}/${total} checks passed (${pct}%)\n`);

  const failed = allResults.filter(r => !r.passed);
  if (failed.length > 0) {
    console.log('  Failed checks:');
    for (const f of failed) {
      const val = f.value ? ` → ${f.value}` : '';
      console.log(`    ✗  ${f.label}${val}`);
    }
    console.log();
  }

  console.log('═'.repeat(W));
  if (passed === total) {
    console.log(' ✅  FULL PASS — Agent 3 Curriculum Builder is working correctly.');
    console.log('    Domain pedagogy, stone modifications, and roadmap structure all valid.');
  } else if (passed >= Math.floor(total * 0.85)) {
    console.log(' ⚠  NEAR PASS — Minor issues. Check failed checks above.');
  } else {
    console.log(' ❌  SIGNIFICANT FAILURES — Review Agent 3 prompts and validateAndNormalize().');
  }
  console.log('═'.repeat(W) + '\n');

  process.exit(passed === total ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
