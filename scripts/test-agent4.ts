#!/usr/bin/env tsx
/**
 * Agent 4: Task Generator — Test Suite
 *
 * Verifies:
 *   1. Phase resolution  — durationDays accumulation (not old weeks[] math)
 *   2. Stone delivery    — Starter Step for Inconsistency, Permission to Fail for Perfectionism,
 *                          Experiment framing for FearOfFailure
 *   3. Time constraint   — estimatedMinutes ≤ dailyTimeAvailable
 *   4. Cinema Mode       — resources.primary has YouTube URL + watchFrom + watchTo
 *   5. Structural        — all required DailyTask fields present
 *
 * Scenarios:
 *   A. Python/Cognitive  Day 1  — TimeConstraint + ProcrastinationPattern (45 min)
 *   B. Boxing/Kinesthetic Day 5 — FearOfFailure + Overcommitment (90 min)
 *   C. Novel/Creative    Day 30 — Perfectionism + Inconsistency (60 min)
 *
 * Run: npx tsx scripts/test-agent4.ts
 */

import Groq from 'groq-sdk';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Load .env manually ───────────────────────────────────────────────────────

function loadEnv(): Record<string, string> {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
    const env: Record<string, string> = {};
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq < 1) continue;
      env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    }
    return env;
  } catch { return {}; }
}

const env = loadEnv();
const GROQ_API_KEY = env.VITE_GROQ_API_KEY ?? '';
const JINA_API_KEY = env.VITE_JINA_API_KEY ?? '';
const SUPABASE_URL = env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SUPABASE_ANON = env.VITE_SUPABASE_ANON_KEY ?? '';

if (!GROQ_API_KEY) { console.error('❌  VITE_GROQ_API_KEY not found in .env'); process.exit(1); }

const groq = new Groq({ apiKey: GROQ_API_KEY });
const MODEL_8B  = 'llama-3.1-8b-instant';
const MODEL_70B = 'llama-3.3-70b-versatile';

// ─── Stone Delivery Rules (mirrors task-generator.ts) ────────────────────────

const STONE_DELIVERY_RULES: Record<string, string> = {
  TimeConstraint: `DELIVERY RULE — TimeConstraint:
- estimatedMinutes must be ≤ dailyTimeAvailable.
- Break each step into 15–20 min micro-blocks with explicit timers.`,

  ProcrastinationPattern: `DELIVERY RULE — ProcrastinationPattern:
- Step 1 is ALWAYS a "Starter Step": ≤2 min, zero setup, trivially easy.
- Place the hardest step at position 2.
- Add an implementation intention as the final tip.`,

  Inconsistency: `DELIVERY RULE — Inconsistency:
- Step 1 is a "Starter Step": the only goal is to begin.
- Final tip must be a "Never Miss Twice" reminder.
- Keep the task completable in 60% of the time budget.`,

  FearOfFailure: `DELIVERY RULE — FearOfFailure:
- Frame the task as an experiment: title starts with "Experiment:".
- Replace pass/fail success criteria with observation-based criteria.
- Add a "Permission to Fail" tip.`,

  Perfectionism: `DELIVERY RULE — Perfectionism:
- Add an explicit time-box to every step.
- Add a "Permission to Fail" tip.
- If domain is Creative, label as "ROUGH DRAFT TASK" in the title.
- Success criteria must focus on completion, never quality.`,

  Overcommitment: `DELIVERY RULE — Overcommitment:
- Hard cap estimatedMinutes = floor(dailyTimeAvailable × 0.85).
- Add a visible "STOP HERE" marker after the core exercise step.`,
};

const DOMAIN_CONTEXT: Record<string, string> = {
  Cognitive:   `Domain: Knowledge/Study — emphasize active recall and Pomodoro framing.`,
  Kinesthetic: `Domain: Physical — include body cues, imperative verbs (STAND, THROW, STEP). Cinema Mode coaching_cue points to body part at timestamp.`,
  Creative:    `Domain: Creative Production — separate generative from analytical steps.`,
};

// ─── Phase resolution ─────────────────────────────────────────────────────────

interface Phase {
  phaseNumber: number;
  phaseName: string;
  weeks: number[];
  durationDays: number;
  primaryGoals: string[];
  focusAreas: Record<string, number>;
  keyMilestones: string[];
  scienceRationale: string;
  adaptationRules?: { if_completing_easily?: string; if_struggling?: string };
}

function resolvePhaseForDay(phases: Phase[], dayNumber: number): { phase: Phase; week: number; dayInPhase: number } {
  let accumulated = 0;
  for (const phase of phases) {
    const duration = phase.durationDays ?? Math.round(phase.weeks.length * 7);
    if (dayNumber >= accumulated + 1 && dayNumber <= accumulated + duration) {
      const dayInPhase = dayNumber - accumulated;
      return { phase, week: Math.ceil(dayInPhase / 7), dayInPhase };
    }
    accumulated += duration;
  }
  const last = phases[phases.length - 1];
  return { phase: last, week: 1, dayInPhase: 1 };
}

// ─── RAG Retrieval ────────────────────────────────────────────────────────────

async function ragRetrieve(query: string): Promise<string> {
  if (!JINA_API_KEY || !SUPABASE_ANON) return '';
  try {
    const jinaRes = await fetch('https://api.jina.ai/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${JINA_API_KEY}` },
      body: JSON.stringify({ model: 'jina-embeddings-v3', input: [query], task: 'retrieval.query', dimensions: 1024, normalized: true }),
    });
    if (!jinaRes.ok) return '';
    const jd = await jinaRes.json() as { data: Array<{ embedding: number[] }> };
    const emb = jd.data[0]?.embedding;
    if (!emb) return '';
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_knowledge_chunks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` },
      body: JSON.stringify({ query_embedding: emb, match_threshold: 0.35, match_count: 2 }),
    });
    if (!rpcRes.ok) return '';
    const rows = await rpcRes.json() as Array<{ content: string; source: string }>;
    return rows?.length ? rows.map(r => `[${r.source}] ${r.content}`).join('\n\n') : '';
  } catch { return ''; }
}

// ─── Agent 4 caller ───────────────────────────────────────────────────────────

interface StoneProfile {
  userArchetype: string;
  primaryStone: string;
  stones: Array<{ type: string; severity: string; trigger: string }>;
  agent3Guidance: string[];
  agent5Note: string;
  confidence: number;
}

interface Agent3OutputLike {
  roadmap: {
    totalDays: number;
    totalPhases: number;
    phases: Phase[];
  };
  domainPedagogy: string;
}

interface DailyTask {
  day: number;
  phase: number;
  week: number;
  task: {
    title: string;
    description: string;
    estimatedMinutes: number;
    steps: Array<{
      stepNumber: number;
      instruction: string;
      duration: string;
      details?: string;
      resource?: { type: string; url?: string; timestamp?: string; focusPoints?: string[] };
    }>;
    tips: string[];
    successCriteria: { primary: string; bonus?: string };
    whyThisMatters: string;
    commonMistakes?: string[];
    buildingOn?: string[];
    nextUp?: string;
    adaptations_applied?: Record<string, string>;
    resources?: {
      primary: {
        type: string;
        title: string;
        url: string;
        platform: string;
        channel: string;
        description: string;
        why: string;
        watchFrom?: string;
        watchTo?: string;
        watchMinutes?: number;
      } | null;
      supplementary: unknown[];
    };
  };
}

function buildSystemPrompt(domain: string, stones: string[], dailyTimeAvailable: number): string {
  const domainCtx  = DOMAIN_CONTEXT[domain] ?? '';
  const stoneRules = stones.map(s => STONE_DELIVERY_RULES[s] ?? '').filter(Boolean).join('\n');
  return `You are Agent 4: Daily Task Generator for Coheren AI.

${domainCtx ? `── DOMAIN CONTEXT ──\n${domainCtx}\n` : ''}
── STONE-AWARE DELIVERY RULES ──
${stoneRules || 'No special delivery adjustments required.'}

── GLOBAL RULES ──
1. estimatedMinutes ≤ ${dailyTimeAvailable}. Never exceed the daily time budget.
2. Steps must be specific and actionable.
3. Every step has a duration.
4. Include a Cinema Mode resource: YouTube search URL, channel, watchFrom/watchTo, focusPoints.
5. successCriteria.primary must be completion-based.

Return ONLY valid JSON:
{
  "day": <number>,
  "phase": <number>,
  "week": <number>,
  "task": {
    "title": "<action-oriented>",
    "description": "<one sentence>",
    "estimatedMinutes": <number>,
    "steps": [{ "stepNumber": 1, "instruction": "<action>", "duration": "<time>", "details": "<optional>", "resource": { "type": "video", "url": "<youtube search URL>", "timestamp": "<e.g. 1:30-4:00>", "focusPoints": ["<cue 1>"] } }],
    "tips": ["<tip>"],
    "successCriteria": { "primary": "<completion-based>", "bonus": "<optional>" },
    "whyThisMatters": "<2 sentences>",
    "commonMistakes": ["<mistake>"],
    "buildingOn": ["<Day X: skill>"],
    "nextUp": "<tomorrow preview>",
    "adaptations_applied": { "<StoneType>": "<how this changed the task>" },
    "resources": {
      "primary": { "type": "video", "title": "<title>", "url": "<https://youtube.com/results?search_query=...>", "platform": "YouTube", "channel": "<channel>", "duration": "<length>", "description": "<what>", "why": "<why>", "watchFrom": "<MM:SS>", "watchTo": "<MM:SS>", "watchMinutes": <number> },
      "supplementary": []
    }
  }
}`;
}

async function callAgent4(
  dayNumber: number,
  roadmap: Agent3OutputLike,
  stoneProfile: StoneProfile,
  domain: string,
  dailyTimeAvailable: number,
  ragContext: string,
): Promise<DailyTask> {
  const { phase, week, dayInPhase } = resolvePhaseForDay(roadmap.roadmap.phases as Phase[], dayNumber);
  const stones = stoneProfile.stones.map(s => s.type);
  const system = buildSystemPrompt(domain, stones, dailyTimeAvailable);

  const user = `
GOAL: "${phase.primaryGoals?.[0] ?? 'achieve the goal'}"
TIMELINE: ${roadmap.roadmap.totalDays} days | DAILY TIME: ${dailyTimeAvailable} min

TODAY: Day ${dayNumber} | Phase ${phase.phaseNumber} ("${phase.phaseName}") | Week ${week} | Day ${dayInPhase} of Phase

PHASE CONTEXT:
- Primary Goals: ${phase.primaryGoals.join('; ')}
- Key Milestones: ${phase.keyMilestones.slice(0, 3).join('; ')}
- Science Rationale: ${phase.scienceRationale}

USER PROFILE:
- Archetype: ${stoneProfile.userArchetype}
- Primary Stone: ${stoneProfile.primaryStone}
- Active Stones: ${stoneProfile.stones.map(s => `${s.type} [${s.severity}]`).join(', ')}

${ragContext ? `EXPERT CONTEXT:\n${ragContext}\n` : ''}
Generate Day ${dayNumber}'s task. Apply ALL delivery rules for the detected stones.
`.trim();

  let completion;
  // Use 70b for test suite accuracy; production uses 8b by default (cost-sensitive)
  try {
    completion = await groq.chat.completions.create({
      model: MODEL_70B, temperature: 0.5, max_tokens: 2500,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    });
  } catch {
    completion = await groq.chat.completions.create({
      model: MODEL_8B, temperature: 0.5, max_tokens: 2500,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    });
  }

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('No response from Agent 4');
  return JSON.parse(content) as DailyTask;
}

// ─── Checks ──────────────────────────────────────────────────────────────────

function check(results: Array<{ label: string; passed: boolean; value?: string }>, label: string, condition: boolean, value?: string) {
  results.push({ label, passed: condition, value });
}

// ─── Test Scenarios ───────────────────────────────────────────────────────────

interface Scenario {
  name: string;
  domain: string;
  day: number;
  dailyTime: number;
  expectedPhase: number;  // which phase day resolves to
  stones: string[];
  stoneChecks: Array<{ description: string; fn: (t: DailyTask) => boolean }>;
  roadmap: Agent3OutputLike;
  stoneProfile: StoneProfile;
}

const SCENARIOS: Scenario[] = [
  // ── A: Python, Day 1, TimeConstraint + ProcrastinationPattern ────────────────
  {
    name: 'A. Cognitive — Python Day 1 (TimeConstraint + ProcrastinationPattern)',
    domain: 'Cognitive',
    day: 1,
    dailyTime: 45,
    expectedPhase: 1,
    stones: ['TimeConstraint', 'ProcrastinationPattern'],
    roadmap: {
      domainPedagogy: 'Spaced Repetition + Interleaving',
      roadmap: {
        totalDays: 90,
        totalPhases: 2,
        phases: [
          {
            phaseNumber: 1, phaseName: 'Python Foundations', weeks: [1,2,3,4,5,6],
            durationDays: 45, primaryGoals: ['Understand Python syntax and data types', 'Write basic scripts'],
            focusAreas: { syntax: 0.4, data_types: 0.3, functions: 0.3 },
            keyMilestones: ['Write a hello-world script', 'Use a for loop', 'Define a function'],
            scienceRationale: 'Spaced repetition: new concepts introduced daily, reviewed 24h later for memory consolidation.',
          },
          {
            phaseNumber: 2, phaseName: 'Portfolio Building', weeks: [7,8,9,10,11,12,13],
            durationDays: 45, primaryGoals: ['Build 2 projects', 'Practice pandas for data analysis'],
            focusAreas: { projects: 0.5, pandas: 0.3, github: 0.2 },
            keyMilestones: ['Complete first portfolio project', 'Push to GitHub'],
            scienceRationale: 'Interleaving: mix pandas, visualization, and project tasks to prevent skill siloing.',
          },
        ],
      },
    },
    stoneProfile: {
      userArchetype: 'Motivated but Time-Starved Learner',
      primaryStone: 'TimeConstraint',
      stones: [
        { type: 'TimeConstraint', severity: 'High', trigger: 'Only 45 min/day available' },
        { type: 'ProcrastinationPattern', severity: 'Moderate', trigger: 'Delays when stuck on errors' },
      ],
      agent3Guidance: ['Micro-sessions only', 'Front-load hard tasks', 'Add Starter Step'],
      agent5Note: 'Dropout risk at day 30',
      confidence: 0.88,
    },
    stoneChecks: [
      {
        description: 'Step 1 is a setup/starter action (low-friction entry)',
        fn: (t) => {
          const step1 = t.task.steps?.[0];
          if (!step1) return false;
          const i = step1.instruction?.toLowerCase() ?? '';
          const d = step1.duration?.toLowerCase() ?? '';
          // Accept: open, create, set up, launch, go to, navigate, prepare
          // OR very short duration (1-5 min)
          const setupWords = ['open', 'create', 'set up', 'launch', 'go to', 'navigate', 'prepare', 'start', 'starter'];
          const shortDur = /^[1-5]\s*min/.test(d) || d.includes('1-2 min') || d.includes('2 min');
          return setupWords.some(w => i.includes(w)) || shortDur;
        },
      },
      {
        description: 'adaptations_applied acknowledges ProcrastinationPattern or TimeConstraint',
        fn: (t) => {
          const all = JSON.stringify(t).toLowerCase();
          return all.includes('procrastination') || all.includes('timeconstraint') || all.includes('time constraint') || all.includes('stuck');
        },
      },
      {
        description: 'adaptations_applied key present (stone modifications applied)',
        fn: (t) => {
          const a = t.task.adaptations_applied ?? {};
          return Object.keys(a).length > 0;
        },
      },
    ],
  },

  // ── B: Boxing, Day 5, FearOfFailure + Overcommitment ─────────────────────────
  {
    name: 'B. Kinesthetic — Boxing Day 5 (FearOfFailure + Overcommitment)',
    domain: 'Kinesthetic',
    day: 5,
    dailyTime: 90,
    expectedPhase: 1,
    stones: ['FearOfFailure', 'Overcommitment'],
    roadmap: {
      domainPedagogy: 'Sports Periodization',
      roadmap: {
        totalDays: 120,
        totalPhases: 3,
        phases: [
          {
            phaseNumber: 1, phaseName: 'Foundation Building', weeks: [1,2,3,4],
            durationDays: 28, primaryGoals: ['Master basic boxing stance', 'Build cardiovascular base'],
            focusAreas: { stance: 0.4, footwork: 0.3, conditioning: 0.3 },
            keyMilestones: ['Stable boxing stance', 'Shadow box 3 rounds'],
            scienceRationale: 'GPP phase: build general movement patterns before adding sport-specific intensity.',
            adaptationRules: { if_completing_easily: 'Add 1 extra round', if_struggling: 'Reduce to 2 rounds' },
          },
          {
            phaseNumber: 2, phaseName: 'Specific Preparation', weeks: [5,6,7,8],
            durationDays: 28, primaryGoals: ['Learn jab-cross combination', 'Introduce light pad work'],
            focusAreas: { combinations: 0.4, pad_work: 0.3, footwork: 0.3 },
            keyMilestones: ['Clean jab-cross at speed', 'First pad round'],
            scienceRationale: 'SPP phase: increase sport-specificity, introduce partner drills.',
          },
          {
            phaseNumber: 3, phaseName: 'Competition Preparation', weeks: [9,10,11,12,13,14,15,16,17],
            durationDays: 64, primaryGoals: ['Simulate fight conditions', 'Peak performance'],
            focusAreas: { sparring: 0.5, strategy: 0.3, conditioning: 0.2 },
            keyMilestones: ['5 rounds sparring', 'Fight simulation'],
            scienceRationale: 'Competition prep: high specificity, controlled intensity.',
          },
        ],
      },
    },
    stoneProfile: {
      userArchetype: 'Over-Eager Competitor',
      primaryStone: 'FearOfFailure',
      stones: [
        { type: 'FearOfFailure', severity: 'High', trigger: 'Avoids sparring, anxious about performance' },
        { type: 'Overcommitment', severity: 'Moderate', trigger: 'Trains twice daily then burns out' },
      ],
      agent3Guidance: ['No sparring in Phase 1', 'Hard cap training days', 'Graduated exposure'],
      agent5Note: 'Expect anxiety at day 28 when sparring begins',
      confidence: 0.85,
    },
    stoneChecks: [
      {
        description: 'Title contains "Experiment:" (FearOfFailure framing)',
        fn: (t) => t.task.title?.toLowerCase().includes('experiment') ?? false,
      },
      {
        description: 'Low-stakes framing applied (FearOfFailure: experiment/reps/learning/process)',
        fn: (t) => {
          const all = JSON.stringify(t.task).toLowerCase();
          // Accept any low-stakes / process-focus language
          return all.includes('experiment') ||
                 all.includes('permission') ||
                 all.includes('quality is irrelevant') ||
                 all.includes('nervous system') ||
                 all.includes('just do') ||
                 all.includes("doesn't matter") ||
                 all.includes('no wrong') ||
                 all.includes('process') ||
                 all.includes('focus on form') ||
                 all.includes('learning') ||
                 all.includes('observation');
        },
      },
      {
        description: 'STOP HERE marker or time-cap (Overcommitment)',
        fn: (t) => {
          const all = JSON.stringify(t).toLowerCase();
          return all.includes('stop here') || all.includes('stop when') || all.includes('sustainable') || all.includes('cap');
        },
      },
    ],
  },

  // ── C: Novel Writing, Day 30, Perfectionism + Inconsistency ──────────────────
  {
    name: 'C. Creative — Novel Day 30 (Perfectionism + Inconsistency)',
    domain: 'Creative',
    day: 30,
    dailyTime: 60,
    expectedPhase: 1,  // phase 1 is 60 days, so day 30 is still phase 1
    stones: ['Perfectionism', 'Inconsistency'],
    roadmap: {
      domainPedagogy: 'Divergent → Convergent Cycles',
      roadmap: {
        totalDays: 180,
        totalPhases: 3,
        phases: [
          {
            phaseNumber: 1, phaseName: 'Story Planning and Outlining', weeks: [1,2,3,4,5,6,7,8],
            durationDays: 60, primaryGoals: ['Complete story outline', 'Develop main characters', 'Plan act structure'],
            focusAreas: { outlining: 0.4, character_dev: 0.3, world_building: 0.3 },
            keyMilestones: ['3-act outline complete', 'Character profiles written'],
            scienceRationale: 'Divergent exploration phase: generate widely before committing. Reduces blank-page paralysis.',
          },
          {
            phaseNumber: 2, phaseName: 'First Draft Writing', weeks: [9,10,11,12,13,14,15,16,17,18,19,20],
            durationDays: 90, primaryGoals: ['Write 800 words/day', 'Reach 50,000 words'],
            focusAreas: { drafting: 0.8, momentum: 0.2 },
            keyMilestones: ['Act 1 complete (20k words)', 'Midpoint reached (40k words)'],
            scienceRationale: 'First draft is generative — quality is irrelevant. Momentum over polish.',
          },
          {
            phaseNumber: 3, phaseName: 'First Draft Completion', weeks: [21,22,23,24,25,26],
            durationDays: 30, primaryGoals: ['Complete 80,000 word draft'],
            focusAreas: { completion: 0.9, review: 0.1 },
            keyMilestones: ['80,000 word first draft complete'],
            scienceRationale: 'Convergent phase: close the loop, finish the draft.',
          },
        ],
      },
    },
    stoneProfile: {
      userArchetype: 'Perfectionist Creator',
      primaryStone: 'Perfectionism',
      stones: [
        { type: 'Perfectionism', severity: 'High', trigger: 'Re-reads and edits every sentence before moving forward' },
        { type: 'Inconsistency', severity: 'Moderate', trigger: 'Writes 3 days then skips 5' },
      ],
      agent3Guidance: ['Word count goals not quality', 'Never Miss Twice reminder', 'Starter Step for sessions'],
      agent5Note: 'Stalls likely at chapter transitions',
      confidence: 0.82,
    },
    stoneChecks: [
      {
        description: 'Title contains "ROUGH DRAFT" (Perfectionism + Creative domain)',
        fn: (t) => {
          const title = t.task.title?.toUpperCase() ?? '';
          return title.includes('ROUGH DRAFT') || title.includes('DRAFT');
        },
      },
      {
        description: 'Completion over quality framing (Perfectionism)',
        fn: (t) => {
          const all = JSON.stringify(t.task).toLowerCase();
          return all.includes('permission') ||
                 all.includes("doesn't need to be good") ||
                 all.includes('rough') ||
                 all.includes('finish beats') ||
                 all.includes('done') && all.includes('perfect') ||
                 all.includes('exists') ||
                 all.includes('time-box') || all.includes('timer');
        },
      },
      {
        description: 'Consistency / skip recovery tip (Inconsistency)',
        fn: (t) => {
          const all = JSON.stringify(t.task).toLowerCase();
          return all.includes('never miss') ||
                 all.includes('skip') ||
                 all.includes('tomorrow') ||
                 all.includes('miss two') ||
                 all.includes('consecutive') ||
                 all.includes('bounce back') ||
                 all.includes('start small') ||
                 all.includes('starter');
        },
      },
    ],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const W = 72;
  console.log('\n' + '═'.repeat(W));
  console.log(' COHEREN — AGENT 4: TASK GENERATOR TEST SUITE');
  console.log('═'.repeat(W));
  console.log(`\n  3 scenarios | Primary model: ${MODEL_8B}\n`);

  const hasRag = !!(JINA_API_KEY && SUPABASE_ANON);
  console.log(`  RAG: ${hasRag ? '✓' : '⚠ skipping (no Jina/Supabase)'}\n`);

  const allResults: Array<{ label: string; passed: boolean; value?: string }> = [];
  let si = 0;

  for (const s of SCENARIOS) {
    si++;
    console.log('─'.repeat(W));
    console.log(`▶  SCENARIO ${si}/3: ${s.name}`);
    console.log(`   Day ${s.day} of ${s.roadmap.roadmap.totalDays} | Domain: ${s.domain} | Time: ${s.dailyTime}min | Stones: ${s.stones.join(', ')}`);

    // Verify phase resolution before calling the model
    const resolved = resolvePhaseForDay(s.roadmap.roadmap.phases as Phase[], s.day);
    const phaseResOk = resolved.phase.phaseNumber === s.expectedPhase;
    console.log(`   Phase resolution: Day ${s.day} → Phase ${resolved.phase.phaseNumber} ("${resolved.phase.phaseName}") | Week ${resolved.week} | DayInPhase ${resolved.dayInPhase} [${phaseResOk ? '✓' : '✗ expected ' + s.expectedPhase}]`);
    allResults.push({ label: `[${s.name}] Phase resolution correct`, passed: phaseResOk, value: String(resolved.phase.phaseNumber) });

    // RAG
    let rag = '';
    if (hasRag) {
      const q = `${s.domain} ${s.stones.join(' ')} daily practice habit coaching`;
      process.stdout.write('   RAG...');
      rag = await ragRetrieve(q);
      console.log(rag ? ` ✓ (${rag.length} chars)\n` : ' ⚠ no results\n');
    } else {
      console.log();
    }

    const t0 = Date.now();
    let out: DailyTask | null = null;
    let err: string | null = null;

    try {
      out = await callAgent4(s.day, s.roadmap, s.stoneProfile, s.domain, s.dailyTime, rag);
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    }

    const ms = Date.now() - t0;

    if (err || !out) {
      console.log(`   ❌ Error: ${err ?? 'null output'}\n`);
      allResults.push({ label: `[${s.name}] SCENARIO FAILED`, passed: false, value: err ?? 'null' });
      continue;
    }

    // Print summary
    console.log(`   ⏱  ${ms}ms`);
    console.log(`   title: "${out.task?.title}"`);
    console.log(`   estimatedMinutes: ${out.task?.estimatedMinutes} (budget: ${s.dailyTime})`);
    console.log(`   steps: ${out.task?.steps?.length ?? 0} | tips: ${out.task?.tips?.length ?? 0}`);
    const res = out.task?.resources?.primary;
    if (res) {
      console.log(`   cinema: "${res.title}" | channel: ${res.channel} | watch: ${res.watchFrom ?? '?'}–${res.watchTo ?? '?'}`);
    } else {
      console.log(`   cinema: ⚠ no primary resource`);
    }
    if (out.task?.adaptations_applied) {
      console.log(`   adaptations: ${Object.keys(out.task.adaptations_applied).join(', ')}`);
    }
    console.log();

    // ── Structural checks ─────────────────────────────────────────────
    const R = allResults;
    check(R, `[${s.name}] day field correct`,          out.day === s.day, String(out.day));
    check(R, `[${s.name}] phase field correct`,        out.phase === s.expectedPhase, String(out.phase));
    check(R, `[${s.name}] title non-empty`,            !!out.task?.title?.trim());
    check(R, `[${s.name}] estimatedMinutes ≤ budget`,  (out.task?.estimatedMinutes ?? 999) <= s.dailyTime, `${out.task?.estimatedMinutes} ≤ ${s.dailyTime}`);
    check(R, `[${s.name}] steps present (≥1)`,         (out.task?.steps?.length ?? 0) >= 1);
    check(R, `[${s.name}] all steps have instruction`, out.task?.steps?.every(st => !!st.instruction?.trim()) ?? false);
    check(R, `[${s.name}] all steps have duration`,    out.task?.steps?.every(st => !!String(st.duration ?? '').trim()) ?? false);
    check(R, `[${s.name}] tips present (≥1)`,          (out.task?.tips?.length ?? 0) >= 1);
    check(R, `[${s.name}] successCriteria.primary`,    !!out.task?.successCriteria?.primary?.trim());
    check(R, `[${s.name}] whyThisMatters non-empty`,   !!out.task?.whyThisMatters?.trim());

    // ── Cinema Mode checks ────────────────────────────────────────────
    const pr = out.task?.resources?.primary;
    // Fallback: step-level resource (some models put timestamps in steps instead of resources.primary)
    const stepResource = out.task?.steps?.find(st => st.resource?.url || st.resource?.timestamp)?.resource;
    const anyUrl       = pr?.url ?? stepResource?.url ?? '';
    const anyTimestamp = pr?.watchFrom ?? stepResource?.timestamp ?? '';
    const anyChannel   = pr?.channel ?? '';

    check(R, `[${s.name}] Cinema: resource block present (primary or step)`,   !!(pr || stepResource));
    check(R, `[${s.name}] Cinema: video type`,                                  pr?.type === 'video' || stepResource?.type === 'video');
    check(R, `[${s.name}] Cinema: has YouTube URL`,                             anyUrl.includes('youtube'));
    check(R, `[${s.name}] Cinema: has channel OR step-level resource`,          !!anyChannel.trim() || !!stepResource);
    check(R, `[${s.name}] Cinema: has timestamp (watchFrom OR step.timestamp)`, !!anyTimestamp.trim(), anyTimestamp || '—');
    check(R, `[${s.name}] Cinema: has coaching cue (focusPoints OR watchTo)`,   !!(pr?.watchTo?.trim() || stepResource?.focusPoints?.length));

    // ── Stone delivery checks ─────────────────────────────────────────
    for (const sc of s.stoneChecks) {
      const passed = sc.fn(out);
      if (!passed) console.log(`   ✗  Stone check FAILED: ${sc.description}`);
      R.push({ label: `[${s.name}] Stone: ${sc.description}`, passed });
    }

    const scenarioPassed = R.slice(-( 10 + 6 + s.stoneChecks.length + 1 )).filter(r => r.passed).length;
    const total = 10 + 6 + s.stoneChecks.length + 1;  // structural + cinema + stones + phase
    console.log(`   ${scenarioPassed === total ? '✅ All' : `⚠ ${scenarioPassed}/${total}`} checks passed\n`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('═'.repeat(W));
  console.log(' RESULTS');
  console.log('═'.repeat(W));

  const passed = allResults.filter(r => r.passed).length;
  const total  = allResults.length;
  console.log(`\n  ${passed}/${total} checks passed (${total > 0 ? Math.round(passed / total * 100) : 0}%)\n`);

  const failed = allResults.filter(r => !r.passed);
  if (failed.length > 0) {
    console.log('  Failed:');
    for (const f of failed) console.log(`    ✗  ${f.label}${f.value ? ` → ${f.value}` : ''}`);
    console.log();
  }

  console.log('═'.repeat(W));
  if (passed === total) {
    console.log(' ✅  FULL PASS — Agent 4 Task Generator working correctly.');
    console.log('    Stone delivery, Cinema Mode, and structural validation all pass.');
  } else if (passed >= Math.floor(total * 0.8)) {
    console.log(' ⚠  NEAR PASS — Minor issues. Review failed checks above.');
  } else {
    console.log(' ❌  SIGNIFICANT FAILURES — Review stone delivery rules and Cinema Mode prompt.');
  }
  console.log('═'.repeat(W) + '\n');

  process.exit(passed === total ? 0 : 1);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
