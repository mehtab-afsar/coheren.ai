#!/usr/bin/env node
/**
 * scripts/test-10day-simulation.ts
 *
 * 10-day end-to-end simulation test harness.
 * Runs 3 personas through the full Agent 1→2→3→4→5 chain,
 * simulates 10 days of task completion/skipping, and produces
 * a structured pass/fail report in console + JSON + Markdown.
 *
 * Usage:
 *   npm run test:simulation            (full run, ~5–8 min)
 *   npm run test:simulation -- --dry-run  (mock run, verify output format)
 *
 * What it checks:
 *   Agent 1 — domain, category, complexity, horizon, clarityScore, milestones
 *   Agent 2 — primaryStone, stones array, archetype, guidance, confidence
 *   Agent 3 — phases ≥2, domainPedagogy, phase goals/duration, reviewMoments
 *   Agent 4 — title, steps ≥3, instructions, durations, successCriteria, timing, resources
 *   Agent 5 — overallMastery, paceAdjustment, modifiedTasks, personalizedMessage
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { runOnboardingAgents, runCurriculumBuilder, runTaskGenerator, runCheckpointRecalibration } from '../src/core/agents/orchestrator.ts';
import { extractStones } from '../src/core/agents/stone-identifier/index.ts';

const DRY_RUN = process.argv.includes('--dry-run');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Types ────────────────────────────────────────────────────────────────────

interface Persona {
  id: string;
  name: string;
  goal: string;
  timeline: number;
  dailyTime: number;
  behavioralFlags: string[];
  expectedDomain: string;
  expectedComplexity: string;
}

interface CheckResult {
  label: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  detail?: string;
}

interface DaySimResult {
  day: number;
  action: 'complete' | 'skip';
  taskTitle: string;
  stepCount: number;
  estimatedMinutes: number;
  hasResource: boolean;
  resourceUrlOk: boolean;
  status: 'PASS' | 'FAIL' | 'SKIP';
  skipReason?: string;
  difficultyRating?: number;
  validationErrors: string[];
}

interface SimTask {
  day: number;
  dayNumber?: number;
  title: string;
  type?: string;
  difficultyRating?: number;
  actualDuration?: number;
  duration: number;
  userComment?: string;
  skipped: boolean;
  skipReason?: 'time' | 'health' | 'difficulty' | 'external';
}

interface PersonaReport {
  persona: Persona;
  agent1Checks: CheckResult[];
  agent2Checks: CheckResult[];
  agent3Checks: CheckResult[];
  dayResults: DaySimResult[];
  agent5Checks: CheckResult[];
  totalPass: number;
  totalFail: number;
  totalWarn: number;
  fatalError?: string;
}

interface SimulationReport {
  runId: string;
  runDate: string;
  dryRun: boolean;
  personas: PersonaReport[];
  grandTotalPass: number;
  grandTotalFail: number;
  grandTotalWarn: number;
  criticalFailures: string[];
  durationMs: number;
}

interface DayDirective {
  action: 'complete' | 'skip';
  difficultyRating?: number;
  skipReason?: 'time' | 'health' | 'difficulty' | 'external';
}

// ─── Personas ─────────────────────────────────────────────────────────────────

const PERSONAS: Persona[] = [
  {
    id: 'boxing-beginner',
    name: 'Boxing Beginner',
    goal: 'Learn boxing basics and fundamentals',
    timeline: 90,
    dailyTime: 30,
    behavioralFlags: ['fear of failure', 'inconsistency'],
    expectedDomain: 'Kinesthetic',
    expectedComplexity: 'beginner',
  },
  {
    id: 'coding-learner',
    name: 'Coding Learner',
    goal: 'Learn JavaScript programming from scratch',
    timeline: 60,
    dailyTime: 45,
    behavioralFlags: ['procrastination'],
    expectedDomain: 'Cognitive',
    expectedComplexity: 'beginner',
  },
  {
    id: 'guitar-starter',
    name: 'Guitar Starter',
    goal: 'Learn to play guitar and play my first songs',
    timeline: 120,
    dailyTime: 20,
    behavioralFlags: ['perfectionism', 'overcommitment'],
    expectedDomain: 'Creative',
    expectedComplexity: 'beginner',
  },
];

// ─── Day Directives ───────────────────────────────────────────────────────────
// completionRate=80%, avgDifficulty≈3.1, 1 difficulty skip, 1 health skip → expected: MAINTAIN

const DAY_DIRECTIVES: Record<number, DayDirective> = {
  1:  { action: 'complete', difficultyRating: 3 },
  2:  { action: 'complete', difficultyRating: 3 },
  3:  { action: 'complete', difficultyRating: 5 },
  4:  { action: 'skip',     skipReason: 'difficulty' },
  5:  { action: 'complete', difficultyRating: 4 },
  6:  { action: 'complete', difficultyRating: 3 },
  7:  { action: 'complete', difficultyRating: 3 },
  8:  { action: 'skip',     skipReason: 'health' },
  9:  { action: 'complete', difficultyRating: 2 },
  10: { action: 'complete', difficultyRating: 2 },
};

// ─── Validation helpers ───────────────────────────────────────────────────────

const VALID_DOMAINS   = ['Cognitive', 'Kinesthetic', 'Career', 'Financial', 'Creative', 'Health', 'Lifestyle', 'Hybrid'];
const VALID_STONES    = ['TimeConstraint','ResourceGap','EnvironmentFriction','Inconsistency','FearOfFailure','Perfectionism','LowConfidence','UnrealisticExpectations','FocusFragility','CognitiveFatigue','SkillGap','ProcrastinationPattern','Overcommitment'];
const VAGUE_VERBS_RX  = /^(do|make|work on|practice|study|learn|try|complete|use|look at|stuff|things)\b/i;
const PLACEHOLDER_RX  = /(dQw4w9WgXcQ|XXXXXXXXXX|example\.com|youtu\.be\/VIDEO|placeholder)/i;

function pass(label: string, detail?: string): CheckResult { return { label, status: 'PASS', detail }; }
function fail(label: string, detail?: string): CheckResult { return { label, status: 'FAIL', detail }; }
function warn(label: string, detail?: string): CheckResult { return { label, status: 'WARN', detail }; }
function chk(label: string, ok: boolean, detail?: string): CheckResult { return ok ? pass(label, detail) : fail(label, detail); }

// ─── Agent 1 validation ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateAgent1(output: any, persona: Persona): CheckResult[] {
  const g = output?.goalAnalysis;
  return [
    chk('domain is non-empty string',          typeof g?.domain === 'string' && g.domain.length > 0,  `got "${g?.domain}"`),
    chk('domain matches expected',             g?.domain === persona.expectedDomain,                   `got "${g?.domain}", expected "${persona.expectedDomain}"`),
    chk('domain is valid enum value',          VALID_DOMAINS.includes(g?.domain ?? ''),               `got "${g?.domain}"`),
    chk('category is non-empty string',        typeof g?.category === 'string' && g.category.length > 0, `got "${g?.category}"`),
    chk('complexity matches expected',         g?.complexity === persona.expectedComplexity,           `got "${g?.complexity}"`),
    chk('complexity is valid enum',            ['beginner','intermediate','advanced'].includes(g?.complexity ?? ''), `got "${g?.complexity}"`),
    chk('horizon consistent with timeline',    isHorizonConsistent(g?.horizon, persona.timeline),     `horizon="${g?.horizon}", timeline=${persona.timeline}d`),
    chk('clarityScore is 0–1',                 typeof g?.clarityScore === 'number' && g.clarityScore >= 0 && g.clarityScore <= 1, `got ${g?.clarityScore}`),
    chk('keyMilestones is non-empty array',    Array.isArray(g?.keyMilestones) && g.keyMilestones.length > 0, `got ${g?.keyMilestones?.length ?? 0} items`),
  ];
}

function isHorizonConsistent(horizon: string | undefined, timeline: number): boolean {
  if (!horizon) return false;
  if (timeline <= 30  && horizon === 'Long-term')  return false;
  if (timeline > 365  && horizon === 'Short-term') return false;
  return true;
}

// ─── Agent 2 validation ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateAgent2(output: any): CheckResult[] {
  const sp = output?.stoneProfile;
  return [
    chk('primaryStone is valid stone type',    VALID_STONES.includes(sp?.primaryStone ?? ''),           `got "${sp?.primaryStone}"`),
    chk('stones array has ≥1 entry',           Array.isArray(sp?.stones) && sp.stones.length >= 1,       `got ${sp?.stones?.length ?? 0}`),
    chk('userArchetype is non-empty string',   typeof sp?.userArchetype === 'string' && sp.userArchetype.length > 3, `"${sp?.userArchetype?.slice(0,40)}"`),
    chk('agent3Guidance is non-empty array',   Array.isArray(sp?.agent3Guidance) && sp.agent3Guidance.length >= 1, `got ${sp?.agent3Guidance?.length ?? 0}`),
    chk('agent5Note is non-empty string',      typeof sp?.agent5Note === 'string' && sp.agent5Note.length >= 10,   `${sp?.agent5Note?.length ?? 0} chars`),
    chk('confidence is 0–1',                   typeof sp?.confidence === 'number' && sp.confidence >= 0 && sp.confidence <= 1, `got ${sp?.confidence}`),
  ];
}

// ─── Agent 3 validation ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateAgent3(output: any, timeline: number): CheckResult[] {
  const roadmap = output?.roadmap;
  const phases  = roadmap?.phases ?? [];
  const totalPhaseDays = phases.reduce((s: number, p: { durationDays?: number }) => s + (p.durationDays ?? 0), 0);
  const withinTolerance = totalPhaseDays > 0 && Math.abs(totalPhaseDays - timeline) / timeline <= 0.20;
  const checks: CheckResult[] = [
    chk('roadmap.phases has ≥2 phases',        phases.length >= 2,                                          `got ${phases.length}`),
    chk('domainPedagogy is non-empty string',  typeof output?.domainPedagogy === 'string' && output.domainPedagogy.length > 5, `"${output?.domainPedagogy?.slice(0,40)}"`),
    chk('phase[0] has ≥1 primaryGoals',        Array.isArray(phases[0]?.primaryGoals) && phases[0].primaryGoals.length >= 1, `got ${phases[0]?.primaryGoals?.length ?? 0}`),
    chk('phase[0] durationDays ≥7',            (phases[0]?.durationDays ?? 0) >= 7,                         `got ${phases[0]?.durationDays}`),
    chk('total phase days within ±20% of timeline', withinTolerance,                                         `total=${totalPhaseDays}, timeline=${timeline}`),
    chk('reviewMoments has ≥1 entry',          Array.isArray(roadmap?.reviewMoments) && roadmap.reviewMoments.length >= 1, `got ${roadmap?.reviewMoments?.length ?? 0}`),
    (Array.isArray(phases[0]?.daySkeleton) && phases[0].daySkeleton.length > 0)
      ? pass('daySkeleton present on phase[0]', `${phases[0].daySkeleton.length} entries`)
      : warn('daySkeleton present on phase[0]', 'optional — missing but not fatal'),
    chk('each phase has focusAreas',           phases.every((p: { focusAreas?: unknown }) => p.focusAreas && typeof p.focusAreas === 'object'), `${phases.length} phases checked`),
  ];
  return checks;
}

// ─── Agent 4 validation (per day) ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateAgent4Task(task: any, dailyTime: number): { checks: CheckResult[]; errors: string[] } {
  const t      = task?.task;
  const checks: CheckResult[] = [];
  const errors: string[]      = [];

  const titleOk = typeof t?.title === 'string' && t.title.trim().length > 3;
  checks.push(chk('title is non-empty', titleOk, t?.title?.slice(0, 50)));
  if (!titleOk) errors.push('missing title');

  const noVague = !VAGUE_VERBS_RX.test(t?.title ?? '');
  checks.push(chk('title has no vague verb', noVague, t?.title?.slice(0, 50)));
  if (!noVague) errors.push(`vague title: "${t?.title}"`);

  const stepCount = t?.steps?.length ?? 0;
  checks.push(chk('steps ≥3', stepCount >= 3, `got ${stepCount}`));
  if (stepCount < 3) errors.push(`only ${stepCount} steps`);

  const stepsHaveInstruction = (t?.steps ?? []).every((s: { instruction?: string }) => typeof s.instruction === 'string' && s.instruction.length > 5);
  checks.push(chk('all steps have instruction', stepsHaveInstruction));
  if (!stepsHaveInstruction) errors.push('step missing instruction');

  const stepsHaveDuration = (t?.steps ?? []).every((s: { duration?: string }) => typeof s.duration === 'string' && s.duration.length > 0);
  checks.push(chk('all steps have duration', stepsHaveDuration));
  if (!stepsHaveDuration) errors.push('step missing duration');

  const scOk = typeof t?.successCriteria?.primary === 'string' && t.successCriteria.primary.trim().length > 5;
  checks.push(chk('successCriteria.primary non-empty', scOk, t?.successCriteria?.primary?.slice(0, 60)));
  if (!scOk) errors.push('missing successCriteria.primary');

  const minOk    = typeof t?.estimatedMinutes === 'number';
  const inBudget = minOk && Math.abs(t!.estimatedMinutes - dailyTime) / dailyTime <= 0.25;
  checks.push(chk('estimatedMinutes within ±25% of budget', inBudget, `got ${t?.estimatedMinutes}, budget ${dailyTime}`));
  if (!inBudget) errors.push(`estimatedMinutes ${t?.estimatedMinutes} out of range (budget: ${dailyTime})`);

  const whyOk = typeof t?.whyThisMatters === 'string' && t.whyThisMatters.trim().length > 10;
  checks.push(chk('whyThisMatters non-empty', whyOk));
  if (!whyOk) errors.push('missing whyThisMatters');

  const primary = t?.resources?.primary;
  if (primary) {
    const urlOk = typeof primary.url === 'string' && !PLACEHOLDER_RX.test(primary.url);
    checks.push(chk('resource URL not a placeholder', urlOk, primary.url?.slice(0, 60)));
    if (!urlOk) errors.push(`placeholder resource: "${primary.url}"`);
  }

  return { checks, errors };
}

// ─── Agent 5 validation ───────────────────────────────────────────────────────

function deriveExpectedStatus(tasks: SimTask[]): string {
  if (tasks.length === 0) return 'MAINTAIN';
  const completed   = tasks.filter(t => !t.skipped);
  const skipped     = tasks.filter(t => t.skipped);
  const rate        = (completed.length / tasks.length) * 100;
  const avgDiff     = completed.length > 0
    ? completed.reduce((s, t) => s + (t.difficultyRating ?? 3), 0) / completed.length : 3;
  const healthSkips = skipped.filter(t => t.skipReason === 'health').length;
  const diffSkips   = skipped.filter(t => t.skipReason === 'difficulty').length;

  const sorted = [...tasks].sort((a, b) => (a.day ?? a.dayNumber ?? 0) - (b.day ?? b.dayNumber ?? 0));
  let maxStreak = 0, cur = 0;
  for (const t of sorted) { if (t.skipped) { cur++; maxStreak = Math.max(maxStreak, cur); } else { cur = 0; } }

  if (healthSkips >= 3 || maxStreak >= 4)                         return 'RECOVER';
  if (rate < 60 || (avgDiff > 4 && diffSkips >= 2))               return 'SIMPLIFY';
  if (rate >= 80 && avgDiff <= 2.5)                               return 'ACCELERATE';
  return 'MAINTAIN';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateAgent5(output: any, tasks: SimTask[]): CheckResult[] {
  const ca  = output?.checkpointAnalysis;
  const rs  = output?.recalibratedSprint;
  const expectedStatus = deriveExpectedStatus(tasks);
  const masteryMap: Record<string, string> = { ACCELERATE: 'excelling', MAINTAIN: 'on-track', SIMPLIFY: 'struggling', RECOVER: 'struggling' };
  const paceMap:    Record<string, string> = { ACCELERATE: 'accelerate', MAINTAIN: 'maintain', SIMPLIFY: 'slow-down', RECOVER: 'slow-down' };
  const expectedMastery = masteryMap[expectedStatus];
  const expectedPace    = paceMap[expectedStatus];

  return [
    chk('overallMastery is valid',            ['struggling','on-track','excelling'].includes(ca?.overallMastery ?? ''), `got "${ca?.overallMastery}"`),
    chk(`overallMastery = '${expectedMastery}' (expected for ${expectedStatus})`, ca?.overallMastery === expectedMastery, `got "${ca?.overallMastery}"`),
    chk('paceAdjustment is valid',            ['slow-down','maintain','accelerate'].includes(ca?.paceAdjustment ?? ''), `got "${ca?.paceAdjustment}"`),
    chk(`paceAdjustment = '${expectedPace}' (expected for ${expectedStatus})`,   ca?.paceAdjustment === expectedPace,   `got "${ca?.paceAdjustment}"`),
    chk('nextSprintFocus is non-empty',       typeof ca?.nextSprintFocus === 'string' && ca.nextSprintFocus.length > 5, `"${ca?.nextSprintFocus?.slice(0,50)}"`),
    chk('modifiedTasks has ≥1 entry',         Array.isArray(rs?.modifiedTasks) && rs.modifiedTasks.length >= 1,          `got ${rs?.modifiedTasks?.length ?? 0}`),
    chk('personalizedMessage ≥20 chars',      typeof rs?.personalizedMessage === 'string' && rs.personalizedMessage.length >= 20, `${rs?.personalizedMessage?.length ?? 0} chars`),
    chk('startDay < endDay',                  typeof rs?.startDay === 'number' && typeof rs?.endDay === 'number' && rs.endDay > rs.startDay, `${rs?.startDay}→${rs?.endDay}`),
    chk('pedagogicalChanges present',         rs?.pedagogicalChanges !== undefined && rs.pedagogicalChanges !== null),
  ];
}

// ─── Dry-run mocks ────────────────────────────────────────────────────────────

function mockAgent1Output(persona: Persona) {
  return {
    goalAnalysis: {
      domain: persona.expectedDomain,
      category: persona.id.split('-')[0],
      complexity: persona.expectedComplexity,
      horizon: 'Mid-term',
      clarityScore: 0.85,
      keyMilestones: ['Milestone 1', 'Milestone 2'],
    },
  };
}

function mockAgent2Output() {
  return {
    stoneProfile: {
      primaryStone: 'FearOfFailure',
      stones: [{ type: 'FearOfFailure', severity: 'Medium', riskImpact: 0.7 }],
      userArchetype: 'Motivated but Volatile',
      agent3Guidance: ['Provide safe experimentation space'],
      agent5Note: 'User needs encouragement over challenge',
      confidence: 0.82,
    },
  };
}

function mockAgent3Output(persona: Persona) {
  return {
    domainPedagogy: 'Progressive Skill Building',
    roadmap: {
      phases: [
        { phaseName: 'Foundation', durationDays: Math.round(persona.timeline * 0.4), primaryGoals: ['Build base'], focusAreas: { fundamentals: 0.8 }, daySkeleton: [{ day: 1, theme: 'intro' }] },
        { phaseName: 'Development', durationDays: Math.round(persona.timeline * 0.6), primaryGoals: ['Apply skills'], focusAreas: { practice: 0.7 }, daySkeleton: [] },
      ],
      reviewMoments: [{ day: 7, type: 'reflection', relatedSkills: ['basics'] }],
      totalDurationDays: persona.timeline,
    },
  };
}

function mockDailyTask(day: number, dailyTime: number) {
  return {
    task: {
      title: `Day ${day} Mock Task`,
      description: 'Mock task for dry run',
      estimatedMinutes: dailyTime,
      steps: [
        { instruction: 'Step one instruction text', duration: '5 min' },
        { instruction: 'Step two instruction text', duration: '10 min' },
        { instruction: 'Step three instruction text', duration: '15 min' },
      ],
      successCriteria: { primary: 'Complete all steps successfully', bonus: '' },
      whyThisMatters: 'This builds your foundation progressively.',
      tips: [],
      resources: { primary: null, supplementary: [] },
    },
  };
}

function mockAgent5Output() {
  return {
    checkpointAnalysis: {
      checkpointDay: 10,
      overallMastery: 'on-track',
      strugglingAreas: ['consistency'],
      masteringAreas: ['fundamentals'],
      paceAdjustment: 'maintain',
      motivationalInsights: 'Good progress overall',
      recommendations: ['Keep current pace'],
      nextSprintFocus: 'Build on foundations from Week 1',
    },
    recalibratedSprint: {
      sprintNumber: 1,
      startDay: 11,
      endDay: 24,
      modifiedTasks: [{ dayNumber: 11, modification: 'adjusted', reason: 'Based on difficulty feedback' }],
      pedagogicalChanges: { restDaysAdded: [], reviewDaysAdded: [14], difficultyReduction: false, intensityIncrease: false },
      personalizedMessage: 'Great work completing your first 10 days. Keep this momentum going!',
    },
  };
}

// ─── Console printers ─────────────────────────────────────────────────────────

function printPersonaHeader(persona: Persona): void {
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`PERSONA: ${persona.name}  (${persona.dailyTime} min/day, ${persona.timeline} days)`);
  console.log(`Goal: "${persona.goal}"`);
  console.log('═'.repeat(55));
}

function printSection(name: string, checks: CheckResult[]): void {
  console.log(`\n${name}`);
  console.log('─'.repeat(45));
  for (const c of checks) {
    const icon = c.status === 'PASS' ? '[PASS]' : c.status === 'FAIL' ? '[FAIL]' : '[WARN]';
    const det  = c.detail ? `  →  ${c.detail}` : '';
    console.log(`  ${icon}  ${c.label}${det}`);
  }
}

function printDayRow(r: DaySimResult): void {
  if (r.status === 'SKIP') {
    console.log(`  Day ${String(r.day).padStart(2)}  [SKIP]  reason: ${r.skipReason}`);
    return;
  }
  const icon = r.status === 'PASS' ? '[PASS]' : '[FAIL]';
  const res  = r.hasResource ? (r.resourceUrlOk ? 'resource:OK' : 'resource:WARN') : 'resource:none';
  console.log(`  Day ${String(r.day).padStart(2)}  ${icon}  "${r.taskTitle.slice(0, 32).padEnd(32)}"  ${String(r.stepCount).padStart(1)} steps  ${String(r.estimatedMinutes).padStart(3)}min  ${res}`);
  for (const e of r.validationErrors) {
    console.log(`             ^ ${e}`);
  }
}

// ─── Persona runner ───────────────────────────────────────────────────────────

async function runPersona(persona: Persona): Promise<PersonaReport> {
  const report: PersonaReport = {
    persona, agent1Checks: [], agent2Checks: [], agent3Checks: [],
    dayResults: [], agent5Checks: [],
    totalPass: 0, totalFail: 0, totalWarn: 0,
  };

  printPersonaHeader(persona);

  // ── Agent 1+2 (onboarding) ──────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let goalAnalysis: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stoneProfile: any;

  try {
    if (DRY_RUN) {
      goalAnalysis = mockAgent1Output(persona);
    } else {
      const { goalAnalysis: ga } = await withTimeout(
        runOnboardingAgents(persona.goal, persona.timeline, persona.dailyTime, persona.behavioralFlags),
        35_000, 'Agent 1+2 onboarding'
      );
      goalAnalysis = ga;
    }
    report.agent1Checks = validateAgent1(goalAnalysis, persona);
  } catch (err) {
    report.agent1Checks = [fail('Agent 1+2 call succeeded', String(err))];
    report.fatalError = `Agent 1 failed: ${String(err)}`;
    printSection('AGENT 1 — Goal Analyzer', report.agent1Checks);
    return finalizeReport(report);
  }
  printSection('AGENT 1 — Goal Analyzer', report.agent1Checks);

  // ── Agent 2 (stone extraction) ──────────────────────────────────────────────
  try {
    if (DRY_RUN) {
      stoneProfile = mockAgent2Output();
    } else {
      stoneProfile = await withTimeout(
        extractStones(
          { userId: 'sim-test', goal: persona.goal, timeline: persona.timeline, dailyTimeAvailable: persona.dailyTime },
          goalAnalysis,
          [], // empty → behavioral flags drive worst-case profile
        ),
        35_000, 'Agent 2 stone extraction'
      );
    }
    report.agent2Checks = validateAgent2(stoneProfile);
  } catch (err) {
    report.agent2Checks = [fail('Agent 2 stone extraction succeeded', String(err))];
    report.fatalError = `Agent 2 failed: ${String(err)}`;
    printSection('AGENT 2 — Stone Identifier', report.agent2Checks);
    return finalizeReport(report);
  }
  printSection('AGENT 2 — Stone Identifier', report.agent2Checks);

  // ── Agent 3 (curriculum builder) ────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let roadmapOutput: any;
  try {
    if (DRY_RUN) {
      roadmapOutput = mockAgent3Output(persona);
    } else {
      roadmapOutput = await withTimeout(
        runCurriculumBuilder(persona.goal, persona.timeline, persona.dailyTime, goalAnalysis, stoneProfile),
        35_000, 'Agent 3 curriculum builder'
      );
    }
    report.agent3Checks = validateAgent3(roadmapOutput, persona.timeline);
  } catch (err) {
    report.agent3Checks = [fail('Agent 3 curriculum builder succeeded', String(err))];
    report.fatalError = `Agent 3 failed: ${String(err)}`;
    printSection('AGENT 3 — Curriculum Builder', report.agent3Checks);
    return finalizeReport(report);
  }
  printSection('AGENT 3 — Curriculum Builder', report.agent3Checks);

  // ── Days 1–10 simulation ─────────────────────────────────────────────────────
  console.log('\nDAYS 1–10 SIMULATION');
  console.log('─'.repeat(55));

  const collectedTasks: SimTask[] = [];
  const prevContext: string[] = [];

  for (let day = 1; day <= 10; day++) {
    const directive = DAY_DIRECTIVES[day];

    if (directive.action === 'skip') {
      const dayResult: DaySimResult = {
        day, action: 'skip', taskTitle: '(skipped)', stepCount: 0,
        estimatedMinutes: 0, hasResource: false, resourceUrlOk: false,
        status: 'SKIP', skipReason: directive.skipReason, validationErrors: [],
      };
      report.dayResults.push(dayResult);
      collectedTasks.push({
        day, title: `Day ${day} (skipped)`, skipped: true,
        skipReason: directive.skipReason, duration: persona.dailyTime,
      });
      printDayRow(dayResult);
      continue;
    }

    // Complete day — run Agent 4
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let agentTask: any;
      if (DRY_RUN) {
        agentTask = mockDailyTask(day, persona.dailyTime);
      } else {
        agentTask = await withTimeout(
          runTaskGenerator(day, roadmapOutput, stoneProfile, persona.dailyTime, prevContext.slice(-3).join('; '), persona.goal),
          35_000, `Agent 4 day ${day}`
        );
      }

      const { checks, errors } = validateAgent4Task(agentTask, persona.dailyTime);
      const t           = agentTask?.task;
      const taskTitle   = t?.title ?? '(no title)';
      const stepCount   = t?.steps?.length ?? 0;
      const estMin      = t?.estimatedMinutes ?? 0;
      const primary     = t?.resources?.primary;
      const hasResource = primary != null;
      const resourceUrlOk = !hasResource || (typeof primary?.url === 'string' && !PLACEHOLDER_RX.test(primary.url));

      const dayResult: DaySimResult = {
        day, action: 'complete', taskTitle, stepCount, estimatedMinutes: estMin,
        hasResource, resourceUrlOk, status: errors.length === 0 ? 'PASS' : 'FAIL',
        difficultyRating: directive.difficultyRating, validationErrors: errors,
      };
      report.dayResults.push(dayResult);
      collectedTasks.push({
        day, title: taskTitle, skipped: false,
        difficultyRating: directive.difficultyRating,
        actualDuration: estMin, duration: estMin,
      });
      prevContext.push(`Day ${day}: "${taskTitle}" (difficulty ${directive.difficultyRating}/5)`);
      void checks; // checks are included in errors
      printDayRow(dayResult);
    } catch (err) {
      const dayResult: DaySimResult = {
        day, action: 'complete', taskTitle: '(error)', stepCount: 0, estimatedMinutes: 0,
        hasResource: false, resourceUrlOk: false, status: 'FAIL',
        difficultyRating: directive.difficultyRating,
        validationErrors: [String(err)],
      };
      report.dayResults.push(dayResult);
      collectedTasks.push({
        day, title: `Day ${day} (generation failed)`, skipped: false,
        difficultyRating: directive.difficultyRating, duration: persona.dailyTime,
      });
      printDayRow(dayResult);
    }

    if (day < 10 && !DRY_RUN) await delay(1500);
  }

  // ── Agent 5 (recalibrator) ───────────────────────────────────────────────────
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let agent5Output: any;
    if (DRY_RUN) {
      agent5Output = mockAgent5Output();
    } else {
      agent5Output = await withTimeout(
        runCheckpointRecalibration(
          persona.goal,
          persona.timeline,
          persona.dailyTime,
          roadmapOutput.roadmap,   // pass Roadmap, not Agent3Output
          stoneProfile,
          collectedTasks as Parameters<typeof runCheckpointRecalibration>[6],
          10
        ),
        35_000, 'Agent 5 recalibration'
      );
    }
    report.agent5Checks = validateAgent5(agent5Output, collectedTasks);
  } catch (err) {
    report.agent5Checks = [fail('Agent 5 recalibration succeeded', String(err))];
  }
  printSection('AGENT 5 — Recalibrator (Day 10 Checkpoint)', report.agent5Checks);

  return finalizeReport(report);
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms)
    ),
  ]);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function finalizeReport(report: PersonaReport): PersonaReport {
  const agentChecks = [
    ...report.agent1Checks, ...report.agent2Checks,
    ...report.agent3Checks, ...report.agent5Checks,
  ];
  report.totalPass = agentChecks.filter(c => c.status === 'PASS').length
                   + report.dayResults.filter(d => d.status === 'PASS').length;
  report.totalFail = agentChecks.filter(c => c.status === 'FAIL').length
                   + report.dayResults.filter(d => d.status === 'FAIL').length;
  report.totalWarn = agentChecks.filter(c => c.status === 'WARN').length;
  return report;
}

// ─── Report writers ───────────────────────────────────────────────────────────

function buildMarkdownReport(sim: SimulationReport): string {
  const lines: string[] = [];
  lines.push(`# Coheren 10-Day Simulation Report`);
  lines.push(`**Run:** ${sim.runDate}${sim.dryRun ? '  |  **DRY RUN**' : ''}  |  **Duration:** ${(sim.durationMs / 1000).toFixed(1)}s`);
  lines.push(`**Result:** ${sim.grandTotalPass} passed / ${sim.grandTotalFail} failed / ${sim.grandTotalWarn} warnings`);
  lines.push('');

  for (const pr of sim.personas) {
    const pct = ((pr.totalPass / Math.max(1, pr.totalPass + pr.totalFail)) * 100).toFixed(1);
    lines.push(`## ${pr.persona.name}`);
    lines.push(`Goal: "${pr.persona.goal}" | ${pr.persona.dailyTime} min/day | ${pr.persona.timeline} days`);
    lines.push(`**Result: ${pr.totalPass}/${pr.totalPass + pr.totalFail} checks passed (${pct}%)**`);
    if (pr.fatalError) lines.push(`> FATAL: ${pr.fatalError}`);
    lines.push('');

    for (const [title, checks] of [
      ['Agent 1 — Goal Analyzer', pr.agent1Checks],
      ['Agent 2 — Stone Identifier', pr.agent2Checks],
      ['Agent 3 — Curriculum Builder', pr.agent3Checks],
      ['Agent 5 — Recalibrator', pr.agent5Checks],
    ] as [string, CheckResult[]][]) {
      lines.push(`### ${title}`);
      for (const c of checks) {
        const icon = c.status === 'PASS' ? '✅' : c.status === 'FAIL' ? '❌' : '⚠️';
        lines.push(`- ${icon} ${c.label}${c.detail ? ` — \`${c.detail}\`` : ''}`);
      }
      lines.push('');
    }

    lines.push('### Day Simulation Results');
    lines.push('| Day | Status | Task | Steps | Min | Resource |');
    lines.push('|-----|--------|------|-------|-----|----------|');
    for (const d of pr.dayResults) {
      const icon = d.status === 'PASS' ? '✅' : d.status === 'FAIL' ? '❌' : '⏭';
      const res  = d.status === 'SKIP' ? `skipped (${d.skipReason})`
                 : d.hasResource ? (d.resourceUrlOk ? '✅' : '⚠️') : '—';
      const errs = d.validationErrors.length > 0 ? ` _${d.validationErrors.join('; ')}_` : '';
      lines.push(`| ${d.day} | ${icon} | ${d.taskTitle.slice(0, 28)} | ${d.stepCount} | ${d.estimatedMinutes} | ${res}${errs} |`);
    }
    lines.push('');
  }

  if (sim.criticalFailures.length > 0) {
    lines.push('## Critical Failures');
    for (const f of sim.criticalFailures) lines.push(`- ${f}`);
    lines.push('');
  }

  lines.push('## All Failures');
  let hasAnyFailure = false;
  for (const pr of sim.personas) {
    const allFails = [
      ...pr.agent1Checks, ...pr.agent2Checks,
      ...pr.agent3Checks, ...pr.agent5Checks,
    ].filter(c => c.status === 'FAIL');
    const dayFails = pr.dayResults.filter(d => d.status === 'FAIL');
    if (allFails.length > 0 || dayFails.length > 0) {
      hasAnyFailure = true;
      lines.push(`### ${pr.persona.name}`);
      for (const c of allFails)   lines.push(`- ❌ ${c.label}${c.detail ? `: ${c.detail}` : ''}`);
      for (const d of dayFails)   lines.push(`- ❌ Day ${d.day}: ${d.validationErrors.join(', ')}`);
      lines.push('');
    }
  }
  if (!hasAnyFailure) lines.push('_No failures detected._');

  return lines.join('\n');
}

function writeReports(sim: SimulationReport): void {
  const reportsDir = path.join(__dirname, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  const base     = `simulation-${sim.runId}`;
  const jsonPath = path.join(reportsDir, `${base}.json`);
  const mdPath   = path.join(reportsDir, `${base}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(sim, null, 2), 'utf8');
  fs.writeFileSync(mdPath, buildMarkdownReport(sim), 'utf8');

  console.log(`\nJSON report: ${jsonPath}`);
  console.log(`MD report:   ${mdPath}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const startMs = Date.now();
  const runId   = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  console.log('═'.repeat(55));
  console.log('  COHEREN 10-DAY SIMULATION REPORT');
  console.log(`  Run: ${new Date().toISOString()}${DRY_RUN ? '  [DRY RUN]' : ''}`);
  console.log('═'.repeat(55));
  if (DRY_RUN) {
    console.log('  DRY RUN mode — using mock agent outputs, no API calls');
  } else {
    console.log(`  Running ${PERSONAS.length} personas × 10 days — expected ~5–8 minutes`);
  }

  const personaReports: PersonaReport[] = [];

  for (let i = 0; i < PERSONAS.length; i++) {
    if (i > 0 && !DRY_RUN) {
      console.log('\nPausing 3s between personas...');
      await delay(3000);
    }
    const pr = await runPersona(PERSONAS[i]);
    personaReports.push(pr);

    const pct = ((pr.totalPass / Math.max(1, pr.totalPass + pr.totalFail)) * 100).toFixed(1);
    console.log(`\n${'─'.repeat(55)}`);
    console.log(`${PERSONAS[i].name} RESULT: ${pr.totalPass}/${pr.totalPass + pr.totalFail} checks passed  (${pct}%)`);
    if (pr.fatalError) console.log(`  FATAL: ${pr.fatalError}`);
  }

  const grandTotalPass  = personaReports.reduce((s, r) => s + r.totalPass, 0);
  const grandTotalFail  = personaReports.reduce((s, r) => s + r.totalFail, 0);
  const grandTotalWarn  = personaReports.reduce((s, r) => s + r.totalWarn, 0);
  const criticalFailures = personaReports.filter(r => r.fatalError).map(r => `${r.persona.name}: ${r.fatalError}`);

  const sim: SimulationReport = {
    runId, runDate: new Date().toISOString(), dryRun: DRY_RUN,
    personas: personaReports, grandTotalPass, grandTotalFail, grandTotalWarn,
    criticalFailures, durationMs: Date.now() - startMs,
  };

  console.log('\n' + '═'.repeat(55));
  console.log('GRAND SUMMARY');
  console.log('═'.repeat(55));
  console.log(`  Total checks:  ${grandTotalPass + grandTotalFail + grandTotalWarn}`);
  console.log(`  Passed:        ${grandTotalPass}`);
  console.log(`  Failed:        ${grandTotalFail}`);
  console.log(`  Warnings:      ${grandTotalWarn}`);

  if (criticalFailures.length > 0) {
    console.log('\n  CRITICAL FAILURES:');
    criticalFailures.forEach(f => console.log(`    - ${f}`));
  }

  writeReports(sim);

  if (grandTotalFail > 0) {
    console.log('\n[FAIL] Some checks failed — see report above and MD file for details.');
    process.exit(1);
  } else {
    console.log('\n[PASS] All checks passed!');
  }
}

main().catch(err => {
  console.error('Fatal simulation crash:', err);
  process.exit(2);
});
