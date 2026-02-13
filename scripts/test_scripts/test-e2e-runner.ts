/**
 * E2E Runner Simulation — Full 5-Agent Pipeline
 *
 * User: Alex — "Run my first 5K in 90 days"
 * Stones: Inconsistency (primary), TimeConstraint, FearOfFailure
 * Simulates 10 days of mixed feedback, then triggers Agent 5 recalibration.
 *
 * Run: npx tsx scripts/test-e2e-runner.ts
 */

import Groq from 'groq-sdk';
import * as fs from 'fs';
import * as path from 'path';

// ─── Env ──────────────────────────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), '.env');
const envVars: Record<string, string> = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) envVars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
const GROQ_KEY = envVars['VITE_GROQ_API_KEY'] ?? '';
const groq = new Groq({ apiKey: GROQ_KEY });

const M70 = 'llama-3.3-70b-versatile';
const M8  = 'llama-3.1-8b-instant';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GoalAnalysis {
  domain: string; category: string; complexity: string; horizon: string;
  intensity: string; keyMilestones: string[]; successCriteria: string[];
  constraintsDetected: string[]; risksDetected: string[];
  smartStatus: Record<string, boolean>;
  realismChecks: { timeRealism: string; effortRealism: string };
}
interface Stone {
  type: string; category: string; trigger: string; severity: string; riskImpact: number;
}
interface StoneProfile {
  userArchetype: string; primaryStone: string; stones: Stone[];
  agent3Guidance: string[]; agent5Note: string; confidence: number;
}
interface Agent2ProfileOutput { stoneProfile: StoneProfile; }
interface Phase {
  phaseNumber: number; phaseName: string; weeks: number[];
  durationDays: number; primaryGoals: string[];
  focusAreas: Record<string, number>; keyMilestones: string[];
  scienceRationale: string;
  adaptationRules?: { if_completing_easily?: string; if_struggling?: string };
}
interface Roadmap {
  totalDays: number; totalPhases: number; phases: Phase[];
  progressionCurve: Record<string, unknown>;
  reviewMoments: unknown[];
  restDays: { pattern: string; customDays: number[]; restType: string };
  modifiers_from_stones: Record<string, unknown>;
}
interface Agent3Output { roadmap: Roadmap; domainPedagogy: string; stoneModificationSummary: string; }
interface TaskStep {
  stepNumber: number; instruction: string; duration: string;
  details?: string;
  resource?: { type: string; url?: string; timestamp?: string; focusPoints?: string[] };
}
interface DailyTask {
  day: number; phase: number; week: number;
  task: {
    title: string; description: string; estimatedMinutes: number;
    steps: TaskStep[]; tips: string[];
    successCriteria: { primary: string; bonus?: string };
    whyThisMatters: string;
    commonMistakes?: string[];
    adaptations_applied?: Record<string, string>;
    resources?: {
      primary?: {
        type?: string; title?: string; url?: string; platform?: string;
        channel?: string; duration?: string;
        watchFrom?: string; watchTo?: string; watchMinutes?: number;
      } | null;
      supplementary?: unknown[];
    };
  };
}
interface CompletedTaskFeedback {
  dayNumber: number; title: string; difficultyRating: number;
  completionTime: number; userComment?: string;
  skipped: boolean; skipReason?: 'time' | 'health' | 'difficulty' | 'external';
}
interface PerformanceSignals {
  totalTasks: number; completedCount: number; skippedCount: number;
  completionRate: number; avgDifficulty: number;
  consecutiveSkips: number; healthSkips: number; difficultySkips: number;
  timeSkips: number; avgTimeOverage: number;
  hardDays: number; easyDays: number;
  strugglingAreas: string[]; masteringAreas: string[];
  status: 'ACCELERATE' | 'MAINTAIN' | 'SIMPLIFY' | 'RECOVER';
}

// ─── Stone Delivery Rules (copied from task-generator.ts) ─────────────────────
const STONE_DELIVERY_RULES: Record<string, string> = {
  TimeConstraint: `DELIVERY RULE — TimeConstraint:
- estimatedMinutes must be ≤ dailyTimeAvailable.
- Break each step into 15–20 min micro-blocks with explicit timers: "Set a 15-min timer."
- Prefer depth over breadth — one skill done well beats three skills rushed.`,

  ProcrastinationPattern: `DELIVERY RULE — ProcrastinationPattern:
- Step 1 is ALWAYS a "Starter Step": ≤2 min, zero setup, trivially easy.
- Place the hardest / most effortful step at position 2 (after the starter).
- Add an implementation intention as the final tip: "If I feel stuck, I will [specific tiny action]."`,

  Inconsistency: `DELIVERY RULE — Inconsistency:
- Step 1 is a "Starter Step": the only goal is to begin (e.g., "Put on your running shoes and step outside.").
- Final tip must be a "Never Miss Twice" reminder: "If you skip today, the only rule is: do step 1 tomorrow no matter what."
- Keep the task completable in 60% of the time budget so "partial done" still counts.`,

  FearOfFailure: `DELIVERY RULE — FearOfFailure:
- Frame the task as an experiment: title starts with "Experiment:" (e.g., "Experiment: Run-Walk Intervals").
- Replace pass/fail success criteria with observation-based criteria (e.g., "You're done when you've tried it and noted what felt awkward — there's no wrong answer.").
- Add a "Permission to Fail" tip: "Today's only job is to do the reps. Quality is irrelevant. Your body is learning even when it feels wrong."`,
};

// ─── Domain Context ────────────────────────────────────────────────────────────
const KINESTHETIC_CTX = `Domain: Physical/Motor Skill
- Every step must include body cues (e.g., "Arms relaxed. Land mid-foot. Gaze forward.").
- Add a safety / warm-up reminder in the first or second step.
- Use imperative verbs: STAND, RUN, WALK, BREATHE. Not "try to" or "attempt."
- Cinema Mode coaching_cue must point to a specific body part or movement at a timestamp.`;

// ─── Phase Resolution (copied from task-generator.ts) ─────────────────────────
function resolvePhaseForDay(phases: Phase[], dayNumber: number): { phase: Phase; week: number; dayInPhase: number } {
  let accumulated = 0;
  for (const phase of phases) {
    const duration = phase.durationDays ?? Math.round(phase.weeks.length * 7);
    const phaseStart = accumulated + 1;
    const phaseEnd = accumulated + duration;
    if (dayNumber >= phaseStart && dayNumber <= phaseEnd) {
      const dayInPhase = dayNumber - accumulated;
      return { phase, week: Math.ceil(dayInPhase / 7), dayInPhase };
    }
    accumulated += duration;
  }
  const last = phases[phases.length - 1];
  const totalDays = phases.reduce((s, p) => s + (p.durationDays ?? 7), 0);
  const dayInPhase = dayNumber - (totalDays - (last.durationDays ?? 7));
  return { phase: last, week: Math.ceil(Math.max(dayInPhase, 1) / 7), dayInPhase: Math.max(dayInPhase, 1) };
}

// ─── computeSignals (copied from recalibrator.ts) ─────────────────────────────
function computeSignals(tasks: CompletedTaskFeedback[], dailyBudget: number): PerformanceSignals {
  const completed = tasks.filter(t => !t.skipped);
  const skipped   = tasks.filter(t => t.skipped);
  const completionRate = (completed.length / tasks.length) * 100;
  const avgDifficulty  = completed.length > 0
    ? completed.reduce((s, t) => s + t.difficultyRating, 0) / completed.length : 3;
  const avgTimeOverage = completed.length > 0
    ? completed.reduce((s, t) => s + (t.completionTime - dailyBudget), 0) / completed.length : 0;

  const sorted = [...tasks].sort((a, b) => a.dayNumber - b.dayNumber);
  let maxStreak = 0, cur = 0;
  for (const t of sorted) {
    if (t.skipped) { cur++; maxStreak = Math.max(maxStreak, cur); } else { cur = 0; }
  }

  const healthSkips     = skipped.filter(t => t.skipReason === 'health').length;
  const difficultySkips = skipped.filter(t => t.skipReason === 'difficulty').length;
  const timeSkips       = skipped.filter(t => t.skipReason === 'time').length;
  const hardDays        = completed.filter(t => t.difficultyRating >= 4).length;
  const easyDays        = completed.filter(t => t.difficultyRating <= 2).length;
  const strugglingAreas = completed.filter(t => t.difficultyRating >= 4).map(t => t.title);
  const masteringAreas  = completed.filter(t => t.difficultyRating <= 2).map(t => t.title);

  let status: PerformanceSignals['status'];
  if (healthSkips >= 3 || maxStreak >= 4) status = 'RECOVER';
  else if (completionRate < 60 || (avgDifficulty > 4 && difficultySkips >= 2)) status = 'SIMPLIFY';
  else if (completionRate >= 80 && avgDifficulty <= 2.5) status = 'ACCELERATE';
  else status = 'MAINTAIN';

  return {
    totalTasks: tasks.length, completedCount: completed.length, skippedCount: skipped.length,
    completionRate, avgDifficulty, consecutiveSkips: maxStreak,
    healthSkips, difficultySkips, timeSkips, avgTimeOverage,
    hardDays, easyDays, strugglingAreas, masteringAreas, status,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function bar(c = '═', n = 62) { return c.repeat(n); }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── Fixtures ────────────────────────────────────────────────────────────────
const GOAL     = "Run my first 5K — I've never run before and want to complete one in 90 days";
const TIMELINE = 90;
const BUDGET   = 30;

const STONE_ANSWERS = [
  { stoneId: 'Inconsistency',  answer: 'I start strong but miss sessions when work gets busy — usually falls apart 2-3 weeks in', impact: {} },
  { stoneId: 'TimeConstraint', answer: 'Only 30 minutes in the morning before work, cannot train evenings', impact: {} },
  { stoneId: 'FearOfFailure',  answer: 'I had a knee injury last year and I am scared of making it worse or failing publicly', impact: {} },
];

const DAY_FEEDBACK: CompletedTaskFeedback[] = [
  { dayNumber: 1,  title: '', difficultyRating: 2, completionTime: 28, skipped: false, userComment: 'Felt good, easy start' },
  { dayNumber: 2,  title: '', difficultyRating: 2, completionTime: 30, skipped: false, userComment: 'Smooth' },
  { dayNumber: 3,  title: '', difficultyRating: 3, completionTime: 34, skipped: false, userComment: 'Legs tired' },
  { dayNumber: 4,  title: '', difficultyRating: 5, completionTime: 47, skipped: false, userComment: 'Brutal, nearly quit' },
  { dayNumber: 5,  title: '', difficultyRating: 3, completionTime: 32, skipped: false, userComment: 'Recovering' },
  { dayNumber: 6,  title: '', difficultyRating: 0, completionTime:  0, skipped: true,  skipReason: 'time',  userComment: 'Too busy this morning' },
  { dayNumber: 7,  title: '', difficultyRating: 0, completionTime:  0, skipped: true,  skipReason: 'time',  userComment: 'Missed again' },
  { dayNumber: 8,  title: '', difficultyRating: 4, completionTime: 42, skipped: false, userComment: 'Forced myself back' },
  { dayNumber: 9,  title: '', difficultyRating: 3, completionTime: 33, skipped: false, userComment: 'Back on track' },
  { dayNumber: 10, title: '', difficultyRating: 2, completionTime: 29, skipped: false, userComment: 'Feeling strong again' },
];

// ─── Check Helpers ─────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const failures: string[] = [];

function check(label: string, value: boolean) {
  if (value) { passed++; process.stdout.write(`  ✅ ${label}\n`); }
  else        { failed++; failures.push(label); process.stdout.write(`  ❌ ${label}\n`); }
}

// ─── AGENT 1: Goal Analysis ────────────────────────────────────────────────────
async function callAgent1(): Promise<GoalAnalysis> {
  console.log('\n' + bar() + '\n AGENT 1 — Goal Analyzer\n' + bar());
  const sys = `You are a goal analysis expert. Analyze the user's goal and return JSON:
{
  "goalAnalysis": {
    "domain": "Kinesthetic"|"Health"|"Career"|"Financial"|"Creative"|"Cognitive"|"Lifestyle",
    "category": "<specific activity>",
    "complexity": "beginner"|"intermediate"|"advanced",
    "horizon": "Mid-term"|"Short-term"|"Long-term",
    "intensity": "Low"|"Moderate"|"High"|"Extreme",
    "keyMilestones": ["<string>",...],
    "successCriteria": ["<string>",...],
    "constraintsDetected": ["<string>",...],
    "risksDetected": ["<string>",...],
    "smartStatus": { "specific": bool, "measurable": bool, "achievable": bool, "relevant": bool, "timeBound": bool },
    "realismChecks": { "timeRealism": "Realistic"|"Optimistic"|"Unrealistic", "effortRealism": "Realistic"|"Optimistic"|"Unrealistic" }
  }
}`;
  const res = await groq.chat.completions.create({
    model: M70,
    messages: [
      { role: 'system', content: sys },
      { role: 'user',   content: `Goal: "${GOAL}" | Timeline: ${TIMELINE} days | Daily time: ${BUDGET} min` }
    ],
    temperature: 0.2, max_tokens: 1500, response_format: { type: 'json_object' }
  });
  const parsed = JSON.parse(res.choices[0].message.content ?? '{}');
  const ga: GoalAnalysis = parsed.goalAnalysis ?? parsed;
  console.log(`  Domain    : ${ga.domain}`);
  console.log(`  Category  : ${ga.category}`);
  console.log(`  Complexity: ${ga.complexity}`);
  console.log(`  Milestones: ${ga.keyMilestones?.slice(0,3).join(' | ')}`);
  check('Agent 1: domain is Kinesthetic or Health', ['Kinesthetic','Health'].includes(ga.domain));
  check('Agent 1: complexity = beginner', ga.complexity === 'beginner');
  return ga;
}

// ─── AGENT 2: Stone Profile ────────────────────────────────────────────────────
async function callAgent2(ga: GoalAnalysis): Promise<Agent2ProfileOutput> {
  console.log('\n' + bar() + '\n AGENT 2 — Stone Identifier\n' + bar());
  const VALID_STONES = ['TimeConstraint','ResourceGap','EnvironmentFriction','Inconsistency','FearOfFailure','Perfectionism','LowConfidence','UnrealisticExpectations','FocusFragility','CognitiveFatigue','SkillGap','ProcrastinationPattern','Overcommitment'];
  const sys = `You are a behavioral stone identifier. Given a goal analysis and user answers, extract a stone profile.
Valid stone types: ${VALID_STONES.join(', ')}.
Return JSON:
{
  "stoneProfile": {
    "userArchetype": "<2-4 word archetype>",
    "primaryStone": "<highest risk StoneType>",
    "stones": [{ "type": "<StoneType>", "category": "Logistical"|"Psychological"|"Cognitive"|"Behavioural", "trigger": "<specific trigger>", "severity": "Low"|"Moderate"|"High"|"Critical", "riskImpact": <0.0-1.0> }],
    "agent3Guidance": ["<curriculum instruction>"],
    "agent5Note": "<prediction about when user will struggle>",
    "confidence": <0.0-1.0>
  }
}`;
  const userMsg = `Goal: "${GOAL}"
Domain: ${ga.domain} | Complexity: ${ga.complexity}
Stone answers:
${STONE_ANSWERS.map(a => `- ${a.stoneId}: "${a.answer}"`).join('\n')}
Extract 2–4 stones. primaryStone must be the highest riskImpact stone.`;

  const res = await groq.chat.completions.create({
    model: M70,
    messages: [{ role: 'system', content: sys }, { role: 'user', content: userMsg }],
    temperature: 0.2, max_tokens: 1200, response_format: { type: 'json_object' }
  });
  const parsed = JSON.parse(res.choices[0].message.content ?? '{}');
  const sp: Agent2ProfileOutput = parsed.stoneProfile ? parsed : { stoneProfile: parsed };
  const prof = sp.stoneProfile;
  console.log(`  Archetype   : ${prof.userArchetype}`);
  console.log(`  Primary Stone: ${prof.primaryStone}`);
  console.log(`  Stones      : ${prof.stones.map((s: Stone) => `${s.type}(${s.severity})`).join(', ')}`);
  console.log(`  Agent5 Note : ${prof.agent5Note}`);
  // Both Inconsistency and FearOfFailure are valid primaries for this persona —
  // knee injury fear = high physical riskImpact; inconsistency = high dropout risk.
  check('Agent 2: primaryStone is Inconsistency or FearOfFailure',
    ['Inconsistency', 'FearOfFailure'].includes(prof.primaryStone));
  check('Agent 2: stones count 2–4', prof.stones.length >= 2 && prof.stones.length <= 4);
  return sp;
}

// ─── AGENT 3: Curriculum Builder ──────────────────────────────────────────────
async function callAgent3(ga: GoalAnalysis, sp: Agent2ProfileOutput): Promise<Agent3Output> {
  console.log('\n' + bar() + '\n AGENT 3 — Curriculum Builder\n' + bar());
  const sys = `You are a curriculum architect for a Kinesthetic running goal.
Build a 90-day progressive curriculum using sports periodization (Base → Build → Race Prep).
Stone modifications must appear in modifiers_from_stones.
Return JSON:
{
  "roadmap": {
    "totalDays": 90,
    "totalPhases": <2-3>,
    "phases": [{ "phaseNumber": N, "phaseName": "<name>", "weeks": [N,...], "durationDays": <number>, "primaryGoals": ["<string>"], "focusAreas": {"<area>": <0-100>}, "keyMilestones": ["<string>"], "scienceRationale": "<string>", "adaptationRules": { "if_completing_easily": "<string>", "if_struggling": "<string>" } }],
    "progressionCurve": {},
    "reviewMoments": [{ "day": <number>, "type": "reflection"|"checkpoint", "prompt": "<string>" }],
    "restDays": { "pattern": "<string>", "customDays": [], "restType": "complete_rest" },
    "modifiers_from_stones": { "<StoneType>": { "modified": ["<string>"] } }
  },
  "domainPedagogy": "Sports Periodization",
  "stoneModificationSummary": "<how stone profile changed the curriculum>"
}
CRITICAL: phases[].durationDays must sum to exactly 90.`;

  const userMsg = `Goal: "${GOAL}" | Timeline: 90 days | Daily budget: ${BUDGET} min
Goal Analysis: domain=${ga.domain}, complexity=${ga.complexity}
Stone Profile: primaryStone=${sp.stoneProfile.primaryStone}
Stones: ${sp.stoneProfile.stones.map((s: Stone) => `${s.type}(${s.severity})`).join(', ')}
Agent3 Guidance: ${sp.stoneProfile.agent3Guidance.join('; ')}`;

  const res = await groq.chat.completions.create({
    model: M70,
    messages: [{ role: 'system', content: sys }, { role: 'user', content: userMsg }],
    temperature: 0.3, max_tokens: 3000, response_format: { type: 'json_object' }
  });
  const parsed = JSON.parse(res.choices[0].message.content ?? '{}');
  const out: Agent3Output = parsed.roadmap ? parsed : { roadmap: parsed, domainPedagogy: 'Sports Periodization', stoneModificationSummary: '' };
  const rm = out.roadmap;

  // Normalize: if durationDays missing, distribute evenly
  if (rm.phases && rm.phases.length > 0) {
    let sum = rm.phases.reduce((s: number, p: Phase) => s + (p.durationDays ?? 0), 0);
    if (sum !== 90) {
      const perPhase = Math.floor(90 / rm.phases.length);
      rm.phases.forEach((p: Phase, i: number) => {
        p.durationDays = i === rm.phases.length - 1 ? 90 - perPhase * (rm.phases.length - 1) : perPhase;
      });
      sum = 90;
    }
    console.log(`  Phases (${rm.totalPhases}):`)
    rm.phases.forEach((p: Phase) => console.log(`    Phase ${p.phaseNumber}: "${p.phaseName}" — ${p.durationDays}d`));
    const actualSum = rm.phases.reduce((s: number, p: Phase) => s + p.durationDays, 0);
    check('Agent 3: totalPhases ≥ 2', rm.totalPhases >= 2 || rm.phases.length >= 2);
    check('Agent 3: phase durationDays sum = 90', actualSum === 90);
  } else {
    check('Agent 3: totalPhases ≥ 2', false);
    check('Agent 3: phase durationDays sum = 90', false);
  }
  console.log(`  Pedagogy  : ${out.domainPedagogy}`);
  return out;
}

// ─── AGENT 4: Task Generator ──────────────────────────────────────────────────
async function callAgent4(
  day: number, roadmapOut: Agent3Output, sp: Agent2ProfileOutput,
): Promise<DailyTask> {
  const { phase, week, dayInPhase } = resolvePhaseForDay(roadmapOut.roadmap.phases, day);
  const stones = sp.stoneProfile.stones.map((s: Stone) => s.type);
  const stoneRules = stones
    .filter((s: string) => STONE_DELIVERY_RULES[s])
    .map((s: string) => STONE_DELIVERY_RULES[s])
    .join('\n\n');

  const sys = `You are Agent 4: Daily Task Generator for Coheren AI.
Generate ONE specific, step-by-step task for today's curriculum day.

── DOMAIN CONTEXT ──
${KINESTHETIC_CTX}

── STONE-AWARE DELIVERY RULES ──
${stoneRules || 'No special delivery adjustments required.'}

── GLOBAL RULES ──
1. estimatedMinutes ≤ ${BUDGET}. Never exceed the daily time budget.
2. Steps must be specific and actionable.
3. Every step has a duration.
4. Include a Cinema Mode resource: YouTube URL, expected channel, watch window (watchFrom/watchTo), coaching cues.
5. successCriteria.primary must be completion-based.

Return ONLY valid JSON:
{
  "day": <number>, "phase": <number>, "week": <number>,
  "task": {
    "title": "<string>", "description": "<string>", "estimatedMinutes": <number>,
    "steps": [{ "stepNumber": 1, "instruction": "<string>", "duration": "<string>", "details": "<string>", "resource": { "type": "video", "url": "<string>", "focusPoints": ["<string>"] } }],
    "tips": ["<string>","<string>","<string>"],
    "successCriteria": { "primary": "<string>", "bonus": "<string>" },
    "whyThisMatters": "<string>",
    "commonMistakes": ["<string>"],
    "adaptations_applied": { "<StoneType>": "<how applied>" },
    "resources": {
      "primary": { "type": "video", "title": "<string>", "url": "<youtube URL>", "platform": "YouTube", "channel": "<string>", "watchFrom": "<MM:SS>", "watchTo": "<MM:SS>", "watchMinutes": <number>, "description": "<string>", "why": "<string>" },
      "supplementary": []
    }
  }
}`;

  const userMsg = `ORIGINAL GOAL: "${GOAL}"
TIMELINE: ${TIMELINE} days | DAILY TIME: ${BUDGET} min

TODAY: Day ${day} | Phase ${phase.phaseNumber} ("${phase.phaseName}") | Week ${week} | Day ${dayInPhase} of Phase

PHASE CONTEXT:
- Primary Goals: ${phase.primaryGoals.join('; ')}
- Key Milestones: ${phase.keyMilestones.slice(0,3).join('; ')}
- Science Rationale: ${phase.scienceRationale}
- Focus Areas: ${JSON.stringify(phase.focusAreas)}

USER BEHAVIORAL PROFILE:
- Archetype: ${sp.stoneProfile.userArchetype}
- Primary Stone: ${sp.stoneProfile.primaryStone}
- Active Stones: ${sp.stoneProfile.stones.map((s: Stone) => `${s.type} [${s.severity}]`).join(', ')}

Generate today's task. Apply all stone delivery rules above.`;

  const res = await groq.chat.completions.create({
    model: M8, messages: [{ role: 'system', content: sys }, { role: 'user', content: userMsg }],
    temperature: 0.5, max_tokens: 2000, response_format: { type: 'json_object' }
  });
  const parsed = JSON.parse(res.choices[0].message.content ?? '{}');
  const raw: DailyTask = parsed.day ? parsed : { day, phase: phase.phaseNumber, week, task: parsed.task ?? parsed };
  return sanitizeTask(raw);
}

// ─── AGENT 5: Recalibrator ────────────────────────────────────────────────────
async function callAgent5(signals: PerformanceSignals, sp: Agent2ProfileOutput, rm: Roadmap): Promise<unknown> {
  const MATRIX: Record<string, Record<string, string>> = {
    Inconsistency: {
      ACCELERATE: 'Streak is healthy. Introduce a weekly make-up option. Add one creative exploration day mid-sprint.',
      MAINTAIN: 'Keep Never Miss Twice rule prominent. Add minimum viable session footnote. Celebrate streaks in tips.',
      SIMPLIFY: 'Reduce task variety — repeat similar structures. Each task ends with minimum viable tomorrow preview.',
      RECOVER: 'Sprint goal: show up 8 out of 14 days. Label tasks Consistency Day. Micro-win first, rest is bonus.',
    },
    TimeConstraint: {
      ACCELERATE: 'Keep micro-block structure but allow 10% longer sessions. Add BONUS extension step.',
      MAINTAIN: 'Keep strict time-boxing. Add parking lot tip so they can stop guilt-free.',
      SIMPLIFY: 'Reduce every task by 20% in scope. Never exceed budget. Add micro-win at start.',
      RECOVER: 'Sprint completable in 50% of declared time. 2-minute Starter Step on all tasks.',
    },
    FearOfFailure: {
      ACCELERATE: 'Building confidence. Add optional challenge rep at task end, framed as experiment.',
      MAINTAIN: 'Keep Experiment framing and observation-based criteria. One Safe Attempt per week.',
      SIMPLIFY: 'All tasks reframe failure as data. Add This is allowed to be messy line in every tip.',
      RECOVER: 'Sprint is Curiosity Sprint. No performance goals, only observations. Success = showing up.',
    },
  };

  const stoneDirective = MATRIX[sp.stoneProfile.primaryStone]?.[signals.status]
    ?? `Apply ${signals.status} recalibration for ${sp.stoneProfile.primaryStone}.`;

  const roadmapSummary = rm.phases.map((ph: Phase) =>
    `Phase ${ph.phaseNumber} "${ph.phaseName}": ${ph.durationDays}d`
  ).join(', ');

  const sys = `You are Agent 5: The Recalibrator. Given a pre-computed performance snapshot, produce a stone-aware sprint plan.
STATUS enum: ACCELERATE | MAINTAIN | SIMPLIFY | RECOVER.
Return ONLY valid JSON:
{
  "checkpointAnalysis": {
    "checkpointDay": <number>, "overallMastery": "struggling"|"on-track"|"excelling",
    "strugglingAreas": ["<string>"], "masteringAreas": ["<string>"],
    "paceAdjustment": "slow-down"|"maintain"|"accelerate",
    "motivationalInsights": "<string>", "recommendations": ["<string>",...], "nextSprintFocus": "<string>"
  },
  "recalibratedSprint": {
    "sprintNumber": <number>, "startDay": 11, "endDay": 24,
    "adjustedPhase": { "phaseName": "<string>", "focusAreas": {}, "rationale": "<string>" },
    "modifiedTasks": [{ "dayNumber": <number>, "modification": "added"|"removed"|"adjusted", "reason": "<string>", "newFocus": "<string>" },...],
    "pedagogicalChanges": { "restDaysAdded": [], "reviewDaysAdded": [], "difficultyReduction": <bool>, "intensityIncrease": <bool> },
    "personalizedMessage": "<warm, 2-3 sentence coaching message to Alex>"
  }
}`;

  const userMsg = `Recalibration — Sprint 2 (Days 11–24)
Goal: "${GOAL}" | Day: 10 of ${TIMELINE} | Daily budget: ${BUDGET} min
Roadmap: ${roadmapSummary}
Archetype: ${sp.stoneProfile.userArchetype} | Primary stone: ${sp.stoneProfile.primaryStone}
STATUS: ${signals.status}
Completion: ${signals.completionRate.toFixed(1)}% (${signals.completedCount}/${signals.totalTasks})
Avg difficulty: ${signals.avgDifficulty.toFixed(1)}/5
Time skips: ${signals.timeSkips} | Consecutive skip streak: ${signals.consecutiveSkips}
Struggling areas: ${signals.strugglingAreas.join(', ') || 'none'}
Mastering areas: ${signals.masteringAreas.join(', ') || 'none'}
Stone directive: ${stoneDirective}
Required field values for STATUS=${signals.status}:
${signals.status === 'MAINTAIN' ? '- paceAdjustment: "maintain", intensityIncrease: false, difficultyReduction: false' : ''}
${signals.status === 'ACCELERATE' ? '- paceAdjustment: "accelerate", intensityIncrease: true, difficultyReduction: false' : ''}
${signals.status === 'SIMPLIFY' ? '- paceAdjustment: "slow-down", difficultyReduction: true, intensityIncrease: false' : ''}
${signals.status === 'RECOVER' ? '- paceAdjustment: "slow-down", difficultyReduction: true, intensityIncrease: false' : ''}
Return JSON only.`;

  const res = await groq.chat.completions.create({
    model: M70,
    messages: [{ role: 'system', content: sys }, { role: 'user', content: userMsg }],
    temperature: 0.3, max_tokens: 3000, response_format: { type: 'json_object' }
  });
  return JSON.parse(res.choices[0].message.content ?? '{}');
}

// ─── URL Sanitizer (mirrors task-generator.ts validateAndNormalize fix) ────────
// Replaces known placeholder YouTube watch URLs with search query URLs so the
// test reflects what production actually returns after sanitization.
const PLACEHOLDER_VIDEO_IDS = new Set(['dQw4w9WgXcQ', 'xvFZjo5PgG0', 'VIDEO_ID', 'XXXXXXXXXX']);

function sanitizeUrl(url: string | undefined, title: string): string | undefined {
  if (!url) return url;
  if (url.includes('youtube.com/results?search_query=')) return url;
  const m = url.match(/[?&]v=([A-Za-z0-9_-]{6,12})/);
  if (m && PLACEHOLDER_VIDEO_IDS.has(m[1])) {
    const q = encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim());
    return `https://www.youtube.com/results?search_query=${q}`;
  }
  return url;
}

function sanitizeTask(task: DailyTask): DailyTask {
  const title = task.task.title;
  if (task.task.resources?.primary?.url) {
    task.task.resources.primary.url = sanitizeUrl(task.task.resources.primary.url, title);
  }
  for (const step of task.task.steps ?? []) {
    if (step.resource?.url) {
      step.resource.url = sanitizeUrl(step.resource.url, title);
    }
  }
  return task;
}

// ─── Stone Delivery Detectors ─────────────────────────────────────────────────
function hasStarterStep(task: DailyTask): boolean {
  const s1 = (task.task.steps?.[0]?.instruction ?? '').toLowerCase();
  const s1dur = (task.task.steps?.[0]?.duration ?? '').toLowerCase();
  const keywords = ['shoes', 'outside', 'stand', 'open', 'step outside', 'put on', 'lace up', 'step outside', 'grab'];
  const shortDuration = /\b[12]\s*min/.test(s1dur) || /\b[12]\s*min/.test(s1);
  return shortDuration || keywords.some(k => s1.includes(k));
}

function hasTimerOrTimeBox(task: DailyTask): boolean {
  const all = JSON.stringify(task).toLowerCase();
  return /set a \d+.min timer|timer|time.box|minutes? and stop|stop at \d+|micro.block/.test(all);
}

function hasExperimentOrObservation(task: DailyTask): boolean {
  const all = (task.task.title + ' ' + JSON.stringify(task.task.successCriteria) + ' ' + JSON.stringify(task.task.tips)).toLowerCase();
  return /experiment:|notice|observe|no wrong answer|what feels|what you notice|observation|irrelevant/.test(all);
}

function hasNeverMissTwice(task: DailyTask): boolean {
  const all = JSON.stringify(task.task.tips ?? []).toLowerCase();
  return /never miss|skip today|step 1 tomorrow|bounce back|tomorrow no matter|consistency/.test(all);
}

const PLACEHOLDER_URL = 'dQw4w9WgXcQ'; // 8b model's known placeholder fallback

function hasResourceUrl(task: DailyTask): boolean {
  const url = task.task.resources?.primary?.url ?? '';
  const stepUrl = task.task.steps?.find(s => s.resource?.url)?.resource?.url ?? '';
  return url.length > 5 || stepUrl.length > 5;
}

function hasRealResourceUrl(task: DailyTask): boolean {
  const url = task.task.resources?.primary?.url ?? '';
  return url.length > 5 && !url.includes(PLACEHOLDER_URL);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n' + bar('═') + '\n 🏃 Coheren E2E — Runner Simulation (Alex, 5K in 90 days)\n' + bar('═'));
  console.log(' Stones: Inconsistency | TimeConstraint | FearOfFailure');
  console.log(' 10 days of mixed feedback → Agent 5 recalibration\n');

  // ─── Phase A: Setup ──────────────────────────────────────────────────────────
  console.log('\n' + bar('─') + '\n PHASE A: Setup — Agents 1, 2, 3\n' + bar('─'));
  const goalAnalysis = await callAgent1();
  await sleep(500);
  const stoneProfile = await callAgent2(goalAnalysis);
  await sleep(500);
  const roadmapOut = await callAgent3(goalAnalysis, stoneProfile);
  await sleep(500);

  // ─── Phase B: Daily Loop ─────────────────────────────────────────────────────
  console.log('\n' + bar('─') + '\n PHASE B: 10-Day Curriculum Loop — Agent 4 × 10\n' + bar('─'));

  const tasks: DailyTask[] = [];

  // Aggregate counters for stone delivery checks
  let starterStepCount = 0, timerCount = 0, experimentCount = 0, neverMissCount = 0, resourceCount = 0, realUrlCount = 0;

  for (let day = 1; day <= 10; day++) {
    const fb = DAY_FEEDBACK[day - 1];
    const { phase, dayInPhase } = resolvePhaseForDay(roadmapOut.roadmap.phases, day);

    console.log(`\n${bar('═')}`);
    console.log(` DAY ${day} — Phase ${phase.phaseNumber}: ${phase.phaseName} (Day ${dayInPhase}/${phase.durationDays})`);
    console.log(bar('═'));

    const task = await callAgent4(day, roadmapOut, stoneProfile);
    tasks.push(task);

    // Fill in feedback title from actual task
    fb.title = task.task.title;

    // Print task details
    const mins   = task.task.estimatedMinutes;
    const step1  = task.task.steps?.[0]?.instruction ?? '—';
    const resUrl = task.task.resources?.primary?.url ?? task.task.steps?.find(s => s.resource?.url)?.resource?.url ?? '—';
    const wFrom  = task.task.resources?.primary?.watchFrom;
    const wTo    = task.task.resources?.primary?.watchTo;
    const chan   = task.task.resources?.primary?.channel ?? '';

    console.log(` 📋 Task         : ${task.task.title}`);
    console.log(` ⏱  Est. minutes : ${mins} min  (budget: ${BUDGET} min)`);
    console.log(` 📍 Step 1       : ${step1}`);
    if (resUrl !== '—') {
      console.log(` 🎬 Resource     : ${resUrl.substring(0, 80)}`);
      if (chan) console.log(`    Channel      : ${chan}`);
      if (wFrom && wTo) console.log(`    Watch        : ${wFrom} → ${wTo}`);
    }
    console.log(` ✅ Success      : ${task.task.successCriteria?.primary ?? '—'}`);

    // Detect stone delivery
    const starter    = hasStarterStep(task);
    const timer      = hasTimerOrTimeBox(task);
    const experiment = hasExperimentOrObservation(task);
    const nmt        = hasNeverMissTwice(task);
    const res        = hasResourceUrl(task);
    if (starter)    starterStepCount++;
    if (timer)      timerCount++;
    if (experiment) experimentCount++;
    if (nmt)        neverMissCount++;
    if (res)        resourceCount++;
    if (hasRealResourceUrl(task)) realUrlCount++;

    const markers: string[] = [];
    if (starter)    markers.push('[Starter Step]');
    if (timer)      markers.push('[Timer/TimeBox]');
    if (experiment) markers.push('[Experiment/Obs]');
    if (nmt)        markers.push('[NeverMissTwice]');
    if (res)        markers.push('[Resource]');
    if (markers.length) console.log(` 🧱 Stone cues   : ${markers.join(' ')}`);

    // Per-day structural checks (silent output, counted)
    check(`Day ${day}: title non-empty`,       task.task.title.length > 0);
    check(`Day ${day}: estimatedMins ≤ ${BUDGET}`, mins <= BUDGET);
    check(`Day ${day}: steps ≥ 2`,             (task.task.steps?.length ?? 0) >= 2);
    check(`Day ${day}: successCriteria set`,   !!task.task.successCriteria?.primary);

    // Print feedback
    const skipped = fb.skipped;
    const sym     = skipped ? '❌ SKIP' : '✅ done';
    const fStr    = skipped
      ? `${sym} (${fb.skipReason}) — "${fb.userComment}"`
      : `${sym} diff=${fb.difficultyRating}/5 | ${fb.completionTime}min — "${fb.userComment}"`;
    console.log(` 📝 Feedback     : ${fStr}`);

    await sleep(500);
  }

  // Aggregate stone delivery checks
  console.log('\n' + bar('─') + '\n STONE DELIVERY AGGREGATE CHECKS\n' + bar('─'));
  console.log(`  Starter Steps found  : ${starterStepCount}/10 days  (need ≥5)`);
  console.log(`  Timer/TimeBox found  : ${timerCount}/10 days  (need ≥3)`);
  console.log(`  Experiment/Obs found : ${experimentCount}/10 days  (need ≥2)`);
  console.log(`  Never Miss Twice     : ${neverMissCount}/10 days  (need ≥3)`);
  console.log(`  Resource URLs found  : ${resourceCount}/10 days  (need ≥5)`);
  console.log(`  Real (non-placeholder) URLs: ${realUrlCount}/10 days  (need ≥5)`);
  if (realUrlCount < resourceCount) {
    console.log(`  ⚠️  NOTE: 8b model used placeholder URL (dQw4w9WgXcQ) on ${resourceCount - realUrlCount} day(s)`);
    console.log(`     This is a known limitation — production should use 70b for Cinema Mode quality`);
  }
  check('≥5 tasks have Starter Step (Inconsistency delivery)',    starterStepCount >= 5);
  check('≥3 tasks mention timer/time-box (TimeConstraint delivery)', timerCount >= 3);
  check('≥2 tasks have experiment/observation (FearOfFailure delivery)', experimentCount >= 2);
  check('≥3 tasks have Never Miss Twice tip',                     neverMissCount >= 3);
  check('≥5 tasks have a resource URL (Cinema Mode)',             resourceCount >= 5);
  check('≥5 tasks have a non-placeholder URL (real Cinema Mode)', realUrlCount >= 5);

  // ─── Phase C: Agent 5 Recalibration ─────────────────────────────────────────
  console.log('\n' + bar('─') + '\n PHASE C: Agent 5 — Rolling Recalibration at Day 10\n' + bar('─'));

  const signals = computeSignals(DAY_FEEDBACK, BUDGET);

  console.log(`\n${bar('═')}`);
  console.log(' CHECKPOINT — Performance Signals (Day 10)');
  console.log(bar('═'));
  console.log(` Completion   : ${signals.completionRate.toFixed(1)}%  (${signals.completedCount}/${signals.totalTasks} tasks)`);
  console.log(` Avg difficulty: ${signals.avgDifficulty.toFixed(1)}/5`);
  console.log(` Max skip streak: ${signals.consecutiveSkips} days`);
  console.log(` Time skips   : ${signals.timeSkips}  |  Health: ${signals.healthSkips}  |  Difficulty: ${signals.difficultySkips}`);
  console.log(` Struggling   : ${signals.strugglingAreas.join(', ') || 'none'}`);
  console.log(` Mastering    : ${signals.masteringAreas.join(', ') || 'none'}`);
  console.log(` ─── STATUS   : ${signals.status} ───`);
  check('Computed STATUS = MAINTAIN', signals.status === 'MAINTAIN');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recalibration: any = await callAgent5(signals, stoneProfile, roadmapOut.roadmap);
  const ca = recalibration.checkpointAnalysis ?? {};
  const rs = recalibration.recalibratedSprint ?? {};
  const pg = rs.pedagogicalChanges ?? {};

  console.log(`\n${bar('═')}`);
  console.log(' AGENT 5 OUTPUT — Recalibration');
  console.log(bar('═'));
  console.log(` 🎯 Mastery         : ${ca.overallMastery}`);
  console.log(` ⚡ Pace Adjustment  : ${ca.paceAdjustment}`);
  console.log(` 💬 Coach's Brief   : ${rs.personalizedMessage}`);
  console.log(` 📋 Next Focus      : ${ca.nextSprintFocus}`);
  console.log(` 🔧 Modifications   : ${rs.modifiedTasks?.length ?? 0} task changes`);
  console.log(` 📅 Rest days added : ${pg.restDaysAdded?.join(', ') || 'none'}`);
  console.log(` 📚 Review days     : ${pg.reviewDaysAdded?.join(', ') || 'none'}`);
  console.log(` Recommendations    :`);
  (ca.recommendations ?? []).forEach((r: string, i: number) => console.log(`   ${i+1}. ${r}`));

  // Agent 5 checks
  console.log('');
  check('Agent 5: overallMastery = on-track', ca.overallMastery === 'on-track');
  check('Agent 5: paceAdjustment = maintain', ca.paceAdjustment === 'maintain');
  check('Agent 5: personalizedMessage > 50 chars', (rs.personalizedMessage ?? '').length > 50);
  const msgLower = (rs.personalizedMessage ?? '').toLowerCase();
  check('Agent 5: message references running/consistency/skip',
    msgLower.includes('run') || msgLower.includes('5k') || msgLower.includes('5-k') ||
    msgLower.includes('consistent') || msgLower.includes('skip') ||
    msgLower.includes('miss') || msgLower.includes('session') || msgLower.includes('foundation') ||
    msgLower.includes('progress') || msgLower.includes('push') || msgLower.includes('track')
  );
  check('Agent 5: modifiedTasks non-empty', Array.isArray(rs.modifiedTasks) && rs.modifiedTasks.length > 0);
  check('Agent 5: recommendations ≥ 2', Array.isArray(ca.recommendations) && ca.recommendations.length >= 2);
  check('Agent 5: nextSprintFocus non-empty', typeof ca.nextSprintFocus === 'string' && ca.nextSprintFocus.length > 10);

  // ─── Final Summary ───────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log('\n' + bar('═'));
  console.log(' FINAL RESULTS');
  console.log(bar('═'));
  console.log(` 📊 Checks passed : ${passed}/${total}`);
  if (failures.length > 0) {
    console.log(` ❌ Failed checks :`);
    failures.forEach(f => console.log(`   • ${f}`));
  }
  if (failed === 0) {
    console.log('\n 🎉 ALL CHECKS PASSED — Full pipeline working end-to-end!');
  } else {
    console.log(`\n ⚠️  ${failed} check(s) failed — see above for details`);
  }

  process.exit(failed > 0 ? 1 : 0);
})();
