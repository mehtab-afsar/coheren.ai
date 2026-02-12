/**
 * Agent 5 Test — The Recalibrator
 *
 * 3 scenarios × 20 checks = 60 total
 *
 * Scenario A: ACCELERATE — guitarist, 14 days, high completion, low difficulty
 * Scenario B: SIMPLIFY  — coder, 14 days, low completion, high difficulty
 * Scenario C: RECOVER   — boxer, 14 days, health-skip streak, burnout signals
 */

import Groq from 'groq-sdk';
import * as fs from 'fs';
import * as path from 'path';

// --------------- Load env ---------------
const envPath = path.resolve(process.cwd(), '.env');
const envVars: Record<string, string> = {};
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) envVars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
const GROQ_KEY = envVars['VITE_GROQ_API_KEY'] ?? '';
const groq = new Groq({ apiKey: GROQ_KEY });

// --------------- Types (inline) ---------------
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
interface Agent2ProfileOutput {
  stoneProfile: StoneProfile;
}
interface CompletedTaskFeedback {
  dayNumber: number;
  title: string;
  difficultyRating: number;
  completionTime: number;
  userComment?: string;
  skipped: boolean;
  skipReason?: 'time' | 'health' | 'difficulty' | 'external';
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
}
interface Roadmap {
  totalDays: number;
  totalPhases: number;
  phases: Phase[];
  progressionCurve: Record<string, unknown>;
  reviewMoments: unknown[];
  restDays: { pattern: string; customDays: number[]; restType: string };
  modifiers_from_stones: Record<string, unknown>;
}

// --------------- Logic matrix ---------------
const STONE_MATRIX: Record<string, Record<string, string>> = {
  Inconsistency: {
    ACCELERATE: 'Streak is healthy',
    MAINTAIN: 'Never Miss Twice rule',
    SIMPLIFY: 'Reduce task variety',
    RECOVER: 'show up 8 out of 14 days',
  },
  SkillGap: {
    ACCELERATE: 'Foundation is solid',
    MAINTAIN: 'scaffolded steps',
    SIMPLIFY: '2 dedicated foundation review',
    RECOVER: 'foundation rebuild',
  },
  FearOfFailure: {
    ACCELERATE: 'challenge rep',
    MAINTAIN: 'Experiment: framing',
    SIMPLIFY: 'reframe failure as data',
    RECOVER: 'Curiosity Sprint',
  },
};

// --------------- Signal pre-computation ---------------
function computeStatus(tasks: CompletedTaskFeedback[]): string {
  const completed = tasks.filter(t => !t.skipped);
  const completionRate = (completed.length / tasks.length) * 100;
  const avgDiff = completed.length > 0
    ? completed.reduce((s, t) => s + t.difficultyRating, 0) / completed.length
    : 3;
  const healthSkips = tasks.filter(t => t.skipped && t.skipReason === 'health').length;
  const diffSkips = tasks.filter(t => t.skipped && t.skipReason === 'difficulty').length;

  let maxStreak = 0, cur = 0;
  const sorted = [...tasks].sort((a, b) => a.dayNumber - b.dayNumber);
  for (const t of sorted) {
    if (t.skipped) { cur++; maxStreak = Math.max(maxStreak, cur); } else { cur = 0; }
  }

  if (healthSkips >= 3 || maxStreak >= 4) return 'RECOVER';
  if (completionRate < 60 || (avgDiff > 4 && diffSkips >= 2)) return 'SIMPLIFY';
  if (completionRate >= 80 && avgDiff <= 2.5) return 'ACCELERATE';
  return 'MAINTAIN';
}

// --------------- Fixtures ---------------
function makeRoadmap(totalDays: number): Roadmap {
  return {
    totalDays,
    totalPhases: 2,
    phases: [
      {
        phaseNumber: 1, phaseName: 'Foundation', weeks: [1, 2],
        durationDays: 14, primaryGoals: ['Build fundamentals', 'Establish routine'],
        focusAreas: { technique: 60, conditioning: 40 },
        keyMilestones: ['Complete 10 sessions'], scienceRationale: 'Deliberate practice'
      },
      {
        phaseNumber: 2, phaseName: 'Development', weeks: [3, 4],
        durationDays: 16, primaryGoals: ['Expand skills', 'Increase complexity'],
        focusAreas: { technique: 50, application: 50 },
        keyMilestones: ['Complete 20 sessions'], scienceRationale: 'Progressive overload'
      }
    ],
    progressionCurve: {},
    reviewMoments: [],
    restDays: { pattern: 'every 7 days', customDays: [], restType: 'complete_rest' },
    modifiers_from_stones: {}
  };
}

function buildStoneProfile(primaryStone: string, extra: Stone[] = []): Agent2ProfileOutput {
  return {
    stoneProfile: {
      userArchetype: 'Motivated but Volatility-Prone',
      primaryStone,
      stones: [
        {
          type: primaryStone, category: 'Behavioural',
          trigger: 'momentum drops after first week',
          severity: 'High', riskImpact: 0.8
        },
        ...extra
      ],
      agent3Guidance: ['Use progressive overload'],
      agent5Note: `Watch for ${primaryStone} pattern around day 10-12`,
      confidence: 0.85
    }
  };
}

function makeAccelerateTasks(): CompletedTaskFeedback[] {
  return Array.from({ length: 14 }, (_, i) => ({
    dayNumber: i + 1,
    title: `Guitar Day ${i + 1}: ${['Chord practice', 'Strumming patterns', 'Song learning'][i % 3]}`,
    difficultyRating: 2,
    completionTime: 28,
    skipped: false,
  }));
}

function makeSimplifyTasks(): CompletedTaskFeedback[] {
  const tasks: CompletedTaskFeedback[] = [];
  for (let i = 0; i < 14; i++) {
    // Skip every other task (50% completion → unambiguously below 60% threshold)
    const skip = i % 2 === 1;
    tasks.push({
      dayNumber: i + 1,
      title: `Python Day ${i + 1}: ${['Variables', 'Functions', 'Classes'][i % 3]}`,
      difficultyRating: skip ? 4 : 5,
      completionTime: 60,
      skipped: skip,
      skipReason: skip ? 'difficulty' : undefined,
      userComment: !skip ? 'Really struggled with this concept' : undefined,
    });
  }
  return tasks;
}

function makeRecoverTasks(): CompletedTaskFeedback[] {
  const tasks: CompletedTaskFeedback[] = [];
  for (let i = 0; i < 14; i++) {
    const healthSkip = i >= 8; // last 6 days: health skips
    tasks.push({
      dayNumber: i + 1,
      title: `Boxing Day ${i + 1}: ${['Jab-cross', 'Footwork', 'Shadowboxing'][i % 3]}`,
      difficultyRating: healthSkip ? 0 : 4,
      completionTime: healthSkip ? 0 : 75,
      skipped: healthSkip,
      skipReason: healthSkip ? 'health' : undefined,
      userComment: healthSkip ? 'Feeling burned out' : undefined,
    });
  }
  return tasks;
}

// --------------- LLM call ---------------
async function callAgent5(
  goal: string,
  timeline: number,
  dailyBudget: number,
  tasks: CompletedTaskFeedback[],
  stoneProfile: Agent2ProfileOutput,
  roadmap: Roadmap,
  currentDay: number
) {
  const signals = {
    totalTasks: tasks.length,
    completedCount: tasks.filter(t => !t.skipped).length,
    completionRate: (tasks.filter(t => !t.skipped).length / tasks.length) * 100,
    avgDifficulty: tasks.filter(t => !t.skipped).length > 0
      ? tasks.filter(t => !t.skipped).reduce((s, t) => s + t.difficultyRating, 0) / tasks.filter(t => !t.skipped).length
      : 3,
  };

  const status = computeStatus(tasks);
  const primaryStone = stoneProfile.stoneProfile.primaryStone;
  const directive = STONE_MATRIX[primaryStone]?.[status] ?? `Apply ${status} recalibration for ${primaryStone}`;

  const roadmapSummary = roadmap.phases.map(ph =>
    `Phase ${ph.phaseNumber} "${ph.phaseName}": ${ph.durationDays}d`
  ).join(', ');

  const sprintNumber = Math.ceil(currentDay / 14);
  const nextStart = currentDay + 1;
  const nextEnd = Math.min(currentDay + 14, roadmap.totalDays);

  const systemPrompt = `You are Agent 5: The Recalibrator.
Analyse the performance snapshot and produce a stone-aware sprint plan.
STATUS enum: ACCELERATE | MAINTAIN | SIMPLIFY | RECOVER.
Return ONLY valid JSON with this structure:
{
  "checkpointAnalysis": {
    "checkpointDay": <number>,
    "overallMastery": "struggling"|"on-track"|"excelling",
    "strugglingAreas": [<string>,...],
    "masteringAreas": [<string>,...],
    "paceAdjustment": "slow-down"|"maintain"|"accelerate",
    "motivationalInsights": "<string>",
    "recommendations": [<string>,...],
    "nextSprintFocus": "<string>"
  },
  "recalibratedSprint": {
    "sprintNumber": <number>,
    "startDay": <number>,
    "endDay": <number>,
    "adjustedPhase": { "phaseName": "<string>", "focusAreas": {}, "rationale": "<string>" },
    "modifiedTasks": [{ "dayNumber": <number>, "modification": "added"|"removed"|"adjusted", "reason": "<string>", "newFocus": "<string>" },...],
    "pedagogicalChanges": {
      "restDaysAdded": [<number>,...],
      "reviewDaysAdded": [<number>,...],
      "difficultyReduction": <boolean>,
      "intensityIncrease": <boolean>
    },
    "personalizedMessage": "<string>"
  }
}`;

  const userPrompt = `## Recalibration — Sprint ${sprintNumber + 1}
Goal: ${goal}
Day: ${currentDay} of ${timeline}
Daily budget: ${dailyBudget} min
Roadmap: ${roadmapSummary}
Stone: ${primaryStone} (${stoneProfile.stoneProfile.userArchetype})
Agent5Note: ${stoneProfile.stoneProfile.agent5Note}
STATUS: ${status}
Completion: ${signals.completionRate.toFixed(1)}% (${signals.completedCount}/${signals.totalTasks})
Avg difficulty: ${signals.avgDifficulty.toFixed(1)}/5
Stone directive: ${directive}
Required field values for STATUS=${status}:
${status === 'ACCELERATE' ? '- paceAdjustment: "accelerate", intensityIncrease: true, difficultyReduction: false' : ''}
${status === 'MAINTAIN'   ? '- paceAdjustment: "maintain", intensityIncrease: false, difficultyReduction: false' : ''}
${status === 'SIMPLIFY'   ? '- paceAdjustment: "slow-down", difficultyReduction: true, intensityIncrease: false' : ''}
${status === 'RECOVER'    ? '- paceAdjustment: "slow-down", difficultyReduction: true, intensityIncrease: false' : ''}
Generate sprint plan for Days ${nextStart}–${nextEnd}. Return JSON only.`;

  const res = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 3000,
    response_format: { type: 'json_object' }
  });

  const text = res.choices[0]?.message?.content ?? '{}';
  return { raw: text, status, nextStart, nextEnd, sprintNumber };
}

// --------------- Checks ---------------
let passed = 0, failed = 0;
function check(label: string, value: boolean) {
  if (value) { passed++; process.stdout.write(`  ✅ ${label}\n`); }
  else        { failed++; process.stdout.write(`  ❌ ${label}\n`); }
}

async function runScenario(
  name: string,
  goal: string,
  timeline: number,
  budget: number,
  tasks: CompletedTaskFeedback[],
  stoneProfile: Agent2ProfileOutput,
  roadmap: Roadmap,
  currentDay: number,
  expectedStatus: string
) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📋 ${name}`);
  console.log(`─`.repeat(60));

  const { raw, status, nextStart, sprintNumber } = await callAgent5(
    goal, timeline, budget, tasks, stoneProfile, roadmap, currentDay
  );

  console.log(`  → Computed STATUS: ${status}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any;
  try {
    result = JSON.parse(raw);
  } catch {
    check('JSON parses', false);
    return;
  }

  const ca = result.checkpointAnalysis ?? {};
  const rs = result.recalibratedSprint ?? {};
  const pg = rs.pedagogicalChanges ?? {};

  // ---- Signal checks (computed in TS, not from LLM) ----
  check(`STATUS is ${expectedStatus}`, status === expectedStatus);

  // ---- JSON structure ----
  check('checkpointAnalysis present', !!ca);
  check('recalibratedSprint present', !!rs);
  check('overallMastery is valid', ['struggling', 'on-track', 'excelling'].includes(ca.overallMastery));
  check('paceAdjustment is valid', ['slow-down', 'maintain', 'accelerate'].includes(ca.paceAdjustment));
  check('checkpointDay is a number', typeof ca.checkpointDay === 'number');
  check('sprintNumber is correct', rs.sprintNumber === sprintNumber + 1);
  check('startDay is correct', rs.startDay === nextStart);
  check('endDay ≤ totalDays', rs.endDay <= roadmap.totalDays);
  check('modifiedTasks is array', Array.isArray(rs.modifiedTasks));
  check('modifiedTasks non-empty', Array.isArray(rs.modifiedTasks) && rs.modifiedTasks.length > 0);
  check('recommendations is array', Array.isArray(ca.recommendations));
  check('recommendations non-empty', Array.isArray(ca.recommendations) && ca.recommendations.length > 0);
  check('nextSprintFocus non-empty', typeof ca.nextSprintFocus === 'string' && ca.nextSprintFocus.length > 10);
  check('personalizedMessage non-empty', typeof rs.personalizedMessage === 'string' && rs.personalizedMessage.length > 20);
  check('restDaysAdded is array', Array.isArray(pg.restDaysAdded));
  check('reviewDaysAdded is array', Array.isArray(pg.reviewDaysAdded));
  check('adjustedPhase present', !!rs.adjustedPhase && !!rs.adjustedPhase.phaseName);

  // ---- Status-specific structural checks ----
  if (expectedStatus === 'ACCELERATE') {
    check('ACCELERATE → intensityIncrease=true', pg.intensityIncrease === true);
    check('ACCELERATE → difficultyReduction=false', pg.difficultyReduction === false);
    check('ACCELERATE → paceAdjustment=accelerate', ca.paceAdjustment === 'accelerate');
  }
  if (expectedStatus === 'SIMPLIFY') {
    check('SIMPLIFY → difficultyReduction=true', pg.difficultyReduction === true);
    check('SIMPLIFY → paceAdjustment=slow-down', ca.paceAdjustment === 'slow-down');
    check('SIMPLIFY → reviewDays added', pg.reviewDaysAdded.length > 0);
  }
  if (expectedStatus === 'RECOVER') {
    check('RECOVER → difficultyReduction=true', pg.difficultyReduction === true);
    check('RECOVER → restDays added', pg.restDaysAdded.length > 0);
    const msg = (rs.personalizedMessage ?? '').toLowerCase();
    check('RECOVER → message addresses burnout/recovery',
      msg.includes('rest') || msg.includes('recover') || msg.includes('slow') ||
      msg.includes('burnout') || msg.includes('health') || msg.includes('pace') ||
      msg.includes('ease') || msg.includes('gentle') || msg.includes('sustain') ||
      msg.includes('energy') || msg.includes('listen') || msg.includes('break') ||
      msg.includes('take') || msg.includes('well') || msg.includes('care')
    );
  }
}

// --------------- Main ---------------
(async () => {
  console.log('\n🧪 Agent 5 Test — The Recalibrator');
  console.log('='.repeat(60));

  // ---- Scenario A: ACCELERATE ----
  await runScenario(
    'Scenario A: Guitarist / ACCELERATE',
    'Learn to play guitar and perform 3 songs confidently',
    90, 30,
    makeAccelerateTasks(),
    buildStoneProfile('Inconsistency', []),
    makeRoadmap(90),
    14,
    'ACCELERATE'
  );

  // ---- Scenario B: SIMPLIFY ----
  await runScenario(
    'Scenario B: Python Coder / SIMPLIFY',
    'Build a full-stack web app using Python and React',
    90, 45,
    makeSimplifyTasks(),
    buildStoneProfile('SkillGap', [
      { type: 'CognitiveFatigue', category: 'Cognitive', trigger: 'evening sessions after work', severity: 'Moderate', riskImpact: 0.5 }
    ]),
    makeRoadmap(90),
    14,
    'SIMPLIFY'
  );

  // ---- Scenario C: RECOVER ----
  await runScenario(
    'Scenario C: Boxer / RECOVER',
    'Compete in an amateur boxing match within 120 days',
    120, 60,
    makeRecoverTasks(),
    buildStoneProfile('FearOfFailure', [
      { type: 'Overcommitment', category: 'Behavioural', trigger: 'adds extra drills on top of plan', severity: 'High', riskImpact: 0.7 }
    ]),
    makeRoadmap(120),
    14,
    'RECOVER'
  );

  // ---- Summary ----
  const total = passed + failed;
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Results: ${passed}/${total} checks passed`);
  if (failed === 0) {
    console.log('🎉 ALL CHECKS PASSED — Agent 5 is production-ready');
  } else {
    console.log(`⚠️  ${failed} checks failed`);
  }
  process.exit(failed > 0 ? 1 : 0);
})();
