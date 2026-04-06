/**
 * Agent 5: The Recalibrator
 *
 * Triggered every 14 days (or at checkpoints) to:
 * 1. Pre-compute behavioral performance signals from the last sprint
 * 2. Apply the stone × signal logic matrix to derive a recalibration STATUS
 * 3. Inject stone-specific directives + optional RAG recovery context
 * 4. Produce a Coach's Brief and adjusted sprint plan for the next 14 days
 *
 * Status enum: ACCELERATE | MAINTAIN | SIMPLIFY | RECOVER
 */

import { callReasoning, callStrategic, callStrategicWithTools } from '@lib/ai-router';
import { retrieveKnowledgeSemantic, retrieveKnowledgeHybrid } from '@core/rag';
import { flags } from '@config/feature-flags';
import { compress } from '@lib/sprintCompressor';
import { retrieveSprintMemories } from '@lib/sprintMemory';
import type {
  StoneType,
  CompletedTaskFeedback,
  CheckpointAnalysis,
  RecalibratedSprint,
  Agent5Input,
  Agent5Output,
} from '@types-app/agents';
import type { AgentRoadmapV2, WeekDay } from '@core/store/useStore';

// ─── New output types for weekly recalibration ────────────────────────────────

export interface RecalibratedWeek {
  weekNumber: number;    // the NEW week being generated (completedWeek + 1)
  title: string;
  theme: string;
  startDay: number;
  endDay: number;
  days: WeekDay[];       // full 7 days for the new week
  rationale: string;     // why these adjustments
  personalizedMessage: string;
  paceAdjustment: 'slow-down' | 'maintain' | 'accelerate';
}

export interface Agent5WeeklyOutput {
  checkpointAnalysis: CheckpointAnalysis;
  recalibratedWeek: RecalibratedWeek;
  /** Updated stone profile with Bayesian severity adjustments. Only present when DYNAMIC_STONE_EVOLUTION is on. */
  evolvedStoneProfile?: import('@types-app/agents').Agent2ProfileOutput;
}

// Extended input for weekly cycle
export interface Agent5WeeklyInput {
  context: { goal: string; timeline: number; dailyMinutes: number };
  roadmap: AgentRoadmapV2;
  stoneProfile: import('@types-app/agents').Agent2ProfileOutput;
  completedTasks: CompletedTaskFeedback[];
  currentDay: number;
  weekNumber: number;
  weeklyCheckInAnswers?: {
    pacing: string;
    hardTopics: string;
    taskTypesFeedback: string;
    raw: string[];
  };
  /** Per-user adaptive thresholds — from roadmaps.config. Defaults applied inside recalibrateWeek. */
  thresholds?: ThresholdAdjustments;
}
// Minimal interface to avoid circular import with @core/store/useStore
interface Task {
  day?: number;
  dayNumber?: number;
  title: string;
  difficultyRating?: number;
  actualDuration?: number;
  duration: number;
  userComment?: string;
  skipped: boolean;
  skipReason?: 'time' | 'health' | 'difficulty' | 'external';
}

// ============================================================
// STATUS ENUM
// ============================================================

type RecalibrationStatus = 'ACCELERATE' | 'MAINTAIN' | 'SIMPLIFY' | 'RECOVER';

// ============================================================
// STONE RECALIBRATION MATRIX
// Per-stone directive for each recalibration status.
// Agent 5 includes the directive for the user's primary stone.
// ============================================================

const STONE_RECALIBRATION_MATRIX: Partial<Record<StoneType, Record<RecalibrationStatus, string>>> = {
  TimeConstraint: {
    ACCELERATE: 'User is thriving within time limits. Keep micro-block structure but allow slightly longer sessions (up to 10% over budget). Introduce one optional extension step per task marked BONUS.',
    MAINTAIN: 'Keep strict time-boxing. Reconfirm every task fits the daily budget. Add one "parking lot" tip so they can stop guilt-free if time runs out.',
    SIMPLIFY: 'Reduce every task by 20% in scope. Split any 2-step tasks into 2 separate day entries. Never exceed budget. Add micro-win at start of each task (<3 min Starter Step).',
    RECOVER: 'Sprint must be completable in 50% of declared daily time. All tasks start with a 2-minute Starter Step. Include a "15-minute win" fallback inside every task description.'
  },

  ProcrastinationPattern: {
    ACCELERATE: 'User is initiating consistently. Introduce slightly more open-ended tasks — reduce scripted micro-steps; trust them to start. Add one reflective question at task end.',
    MAINTAIN: 'Keep Starter Step on every task. Vary the Starter Step so it doesn\'t feel routine (mix physical set-up, verbal declaration, or time-lapse write). Implementation intention tip weekly.',
    SIMPLIFY: 'Starter Step must be ≤90 seconds and physical (open the app, put on gloves, uncap the pen). Add "When–Then" prompt before the main task steps. Reduce step count to ≤3 per task.',
    RECOVER: 'Every task is a Starter Step only — nothing beyond a 3-minute entry point. Label them "Ignition Day". No multi-step sequences. Goal is to re-establish the initiation habit.'
  },

  Inconsistency: {
    ACCELERATE: 'Streak is healthy. Introduce a weekly "make-up" option so they know missing once is safe. Add one creative exploration day mid-sprint to break monotony.',
    MAINTAIN: 'Keep Never Miss Twice rule prominent. Add a "minimum viable session" footnote to each task (e.g., "If short on time: just do Step 1 — 3 min counts"). Celebrate streaks verbally in tips.',
    SIMPLIFY: 'Reduce task variety — repeat similar task structures so the habit feels automatic. Each task ends with "minimum viable tomorrow" preview. Add explicit rest day framing.',
    RECOVER: 'Sprint goal: show up 8 out of 14 days — not 14 out of 14. Each task labelled "Consistency Day". Micro-win first, rest is bonus. Never Miss Twice reminder in personalizedMessage.'
  },

  FearOfFailure: {
    ACCELERATE: 'User is building confidence. Introduce one "challenge rep" at the end of each task — optional, higher difficulty, framed as an experiment. Keep observation-based success criteria.',
    MAINTAIN: 'Keep "Experiment:" framing and observation-based criteria. One task per week is explicitly labelled "Safe Attempt" — outcome irrelevant, data collection only.',
    SIMPLIFY: 'All tasks reframe failure as data. Replace success criteria with "What did you notice?" prompts. Add a "This is allowed to be messy" line in every task tip.',
    RECOVER: 'Sprint is a "Curiosity Sprint" — no performance goals, only observations. Each task starts with "This is an experiment". Success = showing up, not results. Coach\'s Brief must validate that struggling is information, not failure.'
  },

  Perfectionism: {
    ACCELERATE: 'User is releasing good work. Introduce one "polish day" per week — a dedicated refinement session — so perfectionism has a sanctioned outlet. Rest is rough-draft mode.',
    MAINTAIN: 'Keep ROUGH DRAFT TASK framing. Each task has an explicit time-box. Add "Done > Perfect" reminder in tips. One task per week: practise on purpose letting something be "good enough".',
    SIMPLIFY: 'Every task is labelled "ROUGH DRAFT". Hard time-box on every step. Add STOP HERE marker after 80% of budget. Permission to Fail tip required in every task. Success criteria: started AND stopped on time.',
    RECOVER: 'Sprint goal: finish on time, not perfectly. Each task ends with a mandatory "Exit at time" step. Coach\'s Brief must reframe productivity as showing up, not output quality. Add "abandon cleanly" practise task.'
  },

  Overcommitment: {
    ACCELERATE: 'User is staying in scope — great signal. Introduce optional stretch task at end of sprint week (not mid-week). Keep hard cap but widen to 95% of budget.',
    MAINTAIN: 'Keep hard cap at 85% of budget. STOP HERE marker required. Weekly "scope check" in tips: "Is your list of tasks this week realistic?"',
    SIMPLIFY: 'Hard cap reduced to 75% of budget. Each task must have a "minimum viable version" that fits in 50% of budget. Remove any optional steps entirely.',
    RECOVER: 'Cap estimatedMinutes at 60% of budget. Each task is single-focus — one skill, one drill, one output. All multi-part tasks split across separate days. Coach\'s Brief: recovery means doing less, not failing.'
  },

  SkillGap: {
    ACCELERATE: 'Foundation is solid. Push into intermediate concepts. Replace review repetitions with novel applications of the skill. Reduce scaffolding.',
    MAINTAIN: 'Keep scaffolded steps. One review task per week to consolidate. Progressive complexity: each week adds one new micro-skill on top of last week.',
    SIMPLIFY: 'Insert 2 dedicated "foundation review" days this sprint. Break complex tasks into single-skill drills. Add a "prerequisite check" step at start of each task.',
    RECOVER: 'Sprint is a foundation rebuild. Map every task to one specific prerequisite skill. No advancement until fundamentals are confirmed. Coach\'s Brief explains why rebuilding is faster than continuing.'
  },

  CognitiveFatigue: {
    ACCELERATE: 'Cognitive load is manageable. Introduce one "deep work" session (uninterrupted, 1.5× normal time) per week as an optional upgrade.',
    MAINTAIN: 'Keep Pomodoro framing. Space complex tasks across days. Avoid back-to-back high-load tasks in the same sprint week.',
    SIMPLIFY: 'No task should require more than one major cognitive operation. Split complex analysis + creation tasks into 2 days. Add a 5-min decompression step at task end.',
    RECOVER: 'Sprint is low-intensity — review and consolidation only. No new concepts. Short sessions (50% budget). End each task with a 2-min "brain dump" journaling step to offload working memory.'
  },

  FocusFragility: {
    ACCELERATE: 'Focus is strong. Introduce one extended session per week with fewer interruption safeguards. Let them work with fewer micro-breaks.',
    MAINTAIN: 'Keep environment setup step at start. Pomodoro blocks. Clear "end trigger" at task close so they know when to stop.',
    SIMPLIFY: 'Tasks must start with a 3-step environment setup ritual (phone away, timer set, water ready). Reduce task scope to one uninterrupted block. Add "distraction log" optional step.',
    RECOVER: 'Sprint is a "focus rehabilitation" sprint. Each task starts with a 5-min body scan + environment check. Sessions capped at 20 min with mandatory 5-min rest. No context-switching within a session.'
  },

  LowConfidence: {
    ACCELERATE: 'Confidence is building. Introduce peer comparison context ("Most beginners reach X by week N — you\'re on track"). Add one "teach it back" moment per week.',
    MAINTAIN: 'Keep evidence-building language. Each task ends with a "what I proved today" prompt. Celebrate incremental wins explicitly in tips.',
    SIMPLIFY: 'All tasks start with a recap of what they already know ("You can already X — today builds on that"). Success criteria emphasise effort, not outcome. Eliminate any language implying judgment.',
    RECOVER: 'Sprint is a "proof of competence" sprint — tasks are reviews of already-learned skills at reduced difficulty. Goal: rebuild evidence of capability. Coach\'s Brief must list 3 specific things they have already learned this sprint.'
  },

  UnrealisticExpectations: {
    ACCELERATE: 'User is recalibrating well. Introduce milestone preview: show them the next phase outcome so they can see how far they\'ve come and where they\'re going.',
    MAINTAIN: 'Keep expectation-setting language. Weekly "reality check" in tips: "Here\'s where most learners are at this point — you\'re [comparison]."',
    SIMPLIFY: 'Reframe sprint goal as a process milestone, not an outcome milestone. Reduce declared success criteria. Add "typical learner timeline" note to each task to normalise pace.',
    RECOVER: 'Sprint opens with a Coach\'s Brief that recalibrates the overall goal timeline based on actual data. Explicit statement: "You\'re not behind — the original plan was optimistic." All tasks are process-focused, no outcome metrics.'
  },

  ResourceGap: {
    ACCELERATE: 'Access to resources is not a blocker. Maintain resource links but allow them to explore alternative channels if they\'ve found better ones.',
    MAINTAIN: 'Keep curated resource links. Provide one backup resource per task in case primary is unavailable.',
    SIMPLIFY: 'All resources must be free and immediately accessible (no sign-up, no paywall). Provide offline-capable alternatives where possible.',
    RECOVER: 'Sprint uses only zero-cost, no-barrier resources. Add a "no-resource fallback" step to each task that requires only practice, not content consumption.'
  },

  EnvironmentFriction: {
    ACCELERATE: 'Environment is optimised. Introduce one "novel environment" challenge per sprint (practise in a different location) to build adaptability.',
    MAINTAIN: 'Keep environment setup step. Weekly "environment audit" tip: "Is your practice space still serving you?"',
    SIMPLIFY: 'Each task includes a "minimum viable environment" note — what is the least setup required to do this task. Tasks are designed to work in sub-optimal conditions.',
    RECOVER: 'Sprint tasks are fully environment-agnostic — can be done anywhere, anytime, with no equipment. Coach\'s Brief identifies one specific environment barrier and offers a concrete workaround.'
  },
};

// ============================================================
// PERFORMANCE SIGNAL PRE-COMPUTATION
// All signals are computed in TypeScript — not sent raw to LLM
// ============================================================

interface PerformanceSignals {
  totalTasks: number;
  completedCount: number;
  skippedCount: number;
  completionRate: number;           // 0–100
  avgDifficulty: number;            // 1–5
  consecutiveSkips: number;         // longest streak of consecutive skips
  healthSkips: number;              // skips due to health/burnout
  difficultySkips: number;          // skips due to difficulty
  timeSkips: number;                // skips due to time
  avgTimeOverage: number;           // minutes over budget (positive = over)
  hardDays: number;                 // tasks rated 4–5 difficulty
  easyDays: number;                 // tasks rated 1–2 difficulty
  strugglingAreas: string[];        // task titles rated 4–5
  masteringAreas: string[];         // task titles rated 1–2 completed
  status: RecalibrationStatus;
}

// ─── Adaptive threshold types (Item 6) ───────────────────────────────────────

export interface ThresholdAdjustments {
  simplify_completion_rate:   number; // default 60
  accelerate_completion_rate: number; // default 80
  accelerate_avg_difficulty:  number; // default 2.5
  recover_consecutive_skips:  number; // default 4
  recover_health_skips:       number; // default 3
}

export const DEFAULT_THRESHOLDS: ThresholdAdjustments = {
  simplify_completion_rate:   60,
  accelerate_completion_rate: 80,
  accelerate_avg_difficulty:  2.5,
  recover_consecutive_skips:  4,
  recover_health_skips:       3,
};

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/**
 * After each sprint, compare the previous STATUS with the current sprint's
 * outcome and nudge thresholds to reduce systematic misfires.
 * Pure function — no side effects.
 */
export function adaptThresholds(
  prevStatus: RecalibrationStatus,
  current: PerformanceSignals,
  existing: ThresholdAdjustments,
): ThresholdAdjustments {
  const adj = { ...existing };

  if (prevStatus === 'SIMPLIFY') {
    if (current.completionRate >= 75) {
      // Fast recovery → SIMPLIFY was too aggressive, lower the trigger threshold
      adj.simplify_completion_rate = clamp(adj.simplify_completion_rate - 3, 45, 70);
    } else if (current.completionRate < 60) {
      // Still struggling → threshold may need to be more sensitive
      adj.simplify_completion_rate = clamp(adj.simplify_completion_rate + 2, 45, 70);
    }
  } else if (prevStatus === 'ACCELERATE') {
    if (current.completionRate < 65) {
      // Crashed after acceleration → threshold was too loose, raise it
      adj.accelerate_completion_rate = clamp(adj.accelerate_completion_rate + 3, 70, 90);
    } else if (current.completionRate >= 80) {
      // Validated → ease back slightly to reward sustained excellence
      adj.accelerate_completion_rate = clamp(adj.accelerate_completion_rate - 2, 70, 90);
    }
  }

  return adj;
}

export function computeSignals(
  tasks: CompletedTaskFeedback[],
  dailyBudget: number,
  thresholds: ThresholdAdjustments = DEFAULT_THRESHOLDS,
): PerformanceSignals {
  if (tasks.length === 0) {
    return {
      totalTasks: 0, completedCount: 0, skippedCount: 0, completionRate: 0,
      avgDifficulty: 3, consecutiveSkips: 0, healthSkips: 0, difficultySkips: 0,
      timeSkips: 0, avgTimeOverage: 0, hardDays: 0, easyDays: 0,
      strugglingAreas: [], masteringAreas: [], status: 'MAINTAIN'
    };
  }

  const completed = tasks.filter(t => !t.skipped);
  const skipped = tasks.filter(t => t.skipped);

  const completionRate = (completed.length / tasks.length) * 100;
  const avgDifficulty = completed.length > 0
    ? completed.reduce((s, t) => s + t.difficultyRating, 0) / completed.length
    : 3;
  const avgTimeOverage = completed.length > 0
    ? completed.reduce((s, t) => s + (t.completionTime - dailyBudget), 0) / completed.length
    : 0;

  // Consecutive skips — iterate through days sorted by day number
  const sorted = [...tasks].sort((a, b) => a.dayNumber - b.dayNumber);
  let maxStreak = 0, currentStreak = 0;
  for (const t of sorted) {
    if (t.skipped) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
    else { currentStreak = 0; }
  }

  const healthSkips = skipped.filter(t => t.skipReason === 'health').length;
  const difficultySkips = skipped.filter(t => t.skipReason === 'difficulty').length;
  const timeSkips = skipped.filter(t => t.skipReason === 'time').length;

  const hardDays = completed.filter(t => t.difficultyRating >= 4).length;
  const easyDays = completed.filter(t => t.difficultyRating <= 2).length;

  const strugglingAreas = completed.filter(t => t.difficultyRating >= 4).map(t => t.title);
  const masteringAreas = completed.filter(t => t.difficultyRating <= 2).map(t => t.title);

  // STATUS logic matrix — uses per-user adaptive thresholds when provided
  let status: RecalibrationStatus;

  if (healthSkips >= thresholds.recover_health_skips || maxStreak >= thresholds.recover_consecutive_skips) {
    status = 'RECOVER';
  } else if (completionRate < thresholds.simplify_completion_rate || (avgDifficulty > 4 && difficultySkips >= 2)) {
    status = 'SIMPLIFY';
  } else if (completionRate >= thresholds.accelerate_completion_rate && avgDifficulty <= thresholds.accelerate_avg_difficulty) {
    status = 'ACCELERATE';
  } else {
    status = 'MAINTAIN';
  }

  return {
    totalTasks: tasks.length,
    completedCount: completed.length,
    skippedCount: skipped.length,
    completionRate,
    avgDifficulty,
    consecutiveSkips: maxStreak,
    healthSkips,
    difficultySkips,
    timeSkips,
    avgTimeOverage,
    hardDays,
    easyDays,
    strugglingAreas,
    masteringAreas,
    status
  };
}

// ============================================================
// SYSTEM PROMPT
// ============================================================

const AGENT5_SYSTEM_PROMPT = `You are Agent 5: The Recalibrator — a performance-aware curriculum coach.

Your job: analyse a pre-computed performance snapshot and produce a stone-aware, data-driven sprint plan for the next 14 days.

## Recalibration Statuses
- ACCELERATE — user is ahead; compress timeline, introduce challenge
- MAINTAIN — on track; preserve structure, add variety
- SIMPLIFY — struggling technically; reduce scope, add scaffolding
- RECOVER — burnout / skip streak detected; protect motivation, shrink load

## Core Rules
1. The STATUS is provided — trust it. Your job is to apply it, not re-derive it.
2. The Stone Directive is provided — it must be reflected in the sprint plan and personalizedMessage.
3. Never skip foundational skills — adjust PACE, not CONTENT.
4. Every modifiedTask entry must have a specific reason — never "adjust for performance."
5. personalizedMessage must be warm, second-person, concrete, and 2–3 sentences.
6. Return ONLY valid JSON. No markdown, no code blocks.

## Output Schema
{
  "checkpointAnalysis": {
    "checkpointDay": <number>,
    "overallMastery": "struggling" | "on-track" | "excelling",
    "strugglingAreas": [<string>, ...],
    "masteringAreas": [<string>, ...],
    "paceAdjustment": "slow-down" | "maintain" | "accelerate",
    "motivationalInsights": "<string>",
    "recommendations": [<string>, ...],
    "nextSprintFocus": "<string>"
  },
  "recalibratedSprint": {
    "sprintNumber": <number>,
    "startDay": <number>,
    "endDay": <number>,
    "adjustedPhase": {
      "phaseName": "<string>",
      "focusAreas": { "<area>": <0-100>, ... },
      "rationale": "<string>"
    },
    "modifiedTasks": [
      { "dayNumber": <number>, "modification": "added"|"removed"|"adjusted", "reason": "<string>", "newFocus": "<string>" },
      ...
    ],
    "pedagogicalChanges": {
      "restDaysAdded": [<number>, ...],
      "reviewDaysAdded": [<number>, ...],
      "difficultyReduction": <boolean>,
      "intensityIncrease": <boolean>
    },
    "personalizedMessage": "<string>"
  }
}`;

// ============================================================
// MAIN AGENT FUNCTION
// ============================================================

export async function recalibrateCurriculum(
  input: Agent5Input
): Promise<Agent5Output> {
  const { context, roadmap, stoneProfile, completedTasks, currentDay } = input;

  // --- Compress sprint history (no-op when < 28 tasks) ---
  const { recentTasks, snapshot } = await compress(completedTasks, stoneProfile);

  // --- Pre-compute signals (on recent tasks only after compression) ---
  const signals = computeSignals(recentTasks, context.dailyTimeAvailable);
  const { status } = signals;

  // --- Stone directive ---
  const primaryStone = stoneProfile.stoneProfile.primaryStone;
  const stoneDirective = STONE_RECALIBRATION_MATRIX[primaryStone]?.[status] ??
    `Apply ${status} recalibration strategy for a learner with ${primaryStone} stone.`;

  // --- RAG: fetch recovery science when SIMPLIFY or RECOVER ---
  let ragContext = '';
  if (status === 'SIMPLIFY' || status === 'RECOVER') {
    try {
      const query = status === 'RECOVER'
        ? `burnout recovery habit formation ${context.goal}`
        : `learning plateau difficulty reduction scaffolding ${context.goal}`;
      const ragFn = flags.USE_HYBRID_RAG ? retrieveKnowledgeHybrid : retrieveKnowledgeSemantic;
      const ragString = await ragFn({ query, matchCount: 3 });
      ragContext = ragString ? `\n## Recovery Science (RAG)\n${ragString}` : '';
    } catch {
      // RAG failure is non-fatal
    }
  }

  // --- Compact roadmap summary ---
  const roadmapSummary = roadmap.phases.map(ph =>
    `Phase ${ph.phaseNumber} "${ph.phaseName}": ${ph.durationDays}d — ${ph.primaryGoals.slice(0, 2).join(', ')}`
  ).join('\n');

  // --- Sprint number ---
  const sprintNumber = Math.ceil(currentDay / 14);
  const nextStart = currentDay + 1;
  const nextEnd = Math.min(currentDay + 14, roadmap.totalDays);

  const historicalContext = snapshot
    ? `\n## Historical Context (compressed — ${snapshot.totalSprints} total sprints)\n${snapshot.summaryNarrative}\nPeak phase: ${snapshot.peakPerformancePhase} | Drop-off triggers: ${snapshot.knownDropoffTriggers.join(', ') || 'none'}\n`
    : '';

  const userPrompt = `## Recalibration Request — Sprint ${sprintNumber + 1}
${historicalContext}
### Learner
- Goal: ${context.goal}
- Day: ${currentDay} of ${context.timeline}
- Daily budget: ${context.dailyTimeAvailable} min

### Roadmap (summary)
${roadmapSummary}

### Stone Profile
- Archetype: ${stoneProfile.stoneProfile.userArchetype}
- Primary stone: ${primaryStone}
- All stones: ${stoneProfile.stoneProfile.stones.map(s => `${s.type} (${s.severity})`).join(', ')}
- Agent 5 note: ${stoneProfile.stoneProfile.agent5Note}

### Performance Signals (last 14 days)
- STATUS: **${status}**
- Completion rate: ${signals.completionRate.toFixed(1)}%  (${signals.completedCount}/${signals.totalTasks} tasks)
- Avg difficulty: ${signals.avgDifficulty.toFixed(2)}/5
- Consecutive skips (max streak): ${signals.consecutiveSkips}
- Health skips: ${signals.healthSkips} | Difficulty skips: ${signals.difficultySkips} | Time skips: ${signals.timeSkips}
- Avg time overage: ${signals.avgTimeOverage > 0 ? '+' : ''}${signals.avgTimeOverage.toFixed(0)} min/session
- Struggling areas (rated 4-5): ${signals.strugglingAreas.join(', ') || 'none'}
- Mastering areas (rated 1-2): ${signals.masteringAreas.join(', ') || 'none'}

### Stone Directive for ${status}
${stoneDirective}
${ragContext}

### Task
Generate a recalibrated sprint plan for Days ${nextStart}–${nextEnd} (sprint ${sprintNumber + 1}).
Map STATUS to: ACCELERATE→excelling, MAINTAIN→on-track, SIMPLIFY→struggling, RECOVER→struggling.
Map paceAdjustment: ACCELERATE→accelerate, MAINTAIN→maintain, SIMPLIFY/RECOVER→slow-down.
Include ${status === 'RECOVER' ? '2 rest days and 1 review day' : status === 'SIMPLIFY' ? '1 review day' : '0–1 rest days'}.
Return JSON only.`;

  const { content: response } = await callReasoning({
    messages: [
      { role: 'system', content: AGENT5_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 4000,
    response_format: { type: 'json_object' }
  });
  if (!response) throw new Error('Agent 5 returned no response');

  const parsed = JSON.parse(response) as Agent5Output;
  return validateAndNormalize(parsed, signals, currentDay, nextStart, nextEnd, sprintNumber);
}

// ============================================================
// VALIDATE + NORMALIZE
// ============================================================

function validateAndNormalize(
  raw: Agent5Output,
  signals: PerformanceSignals,
  currentDay: number,
  nextStart: number,
  nextEnd: number,
  sprintNumber: number
): Agent5Output {
  const ca: CheckpointAnalysis = {
    checkpointDay: raw.checkpointAnalysis?.checkpointDay ?? currentDay,
    overallMastery: raw.checkpointAnalysis?.overallMastery ?? 'on-track',
    strugglingAreas: Array.isArray(raw.checkpointAnalysis?.strugglingAreas)
      ? raw.checkpointAnalysis.strugglingAreas
      : signals.strugglingAreas,
    masteringAreas: Array.isArray(raw.checkpointAnalysis?.masteringAreas)
      ? raw.checkpointAnalysis.masteringAreas
      : signals.masteringAreas,
    paceAdjustment: raw.checkpointAnalysis?.paceAdjustment ?? 'maintain',
    motivationalInsights: raw.checkpointAnalysis?.motivationalInsights ?? '',
    recommendations: Array.isArray(raw.checkpointAnalysis?.recommendations)
      ? raw.checkpointAnalysis.recommendations
      : [],
    nextSprintFocus: raw.checkpointAnalysis?.nextSprintFocus ?? ''
  };

  const rs: RecalibratedSprint = {
    sprintNumber: raw.recalibratedSprint?.sprintNumber ?? (sprintNumber + 1),
    startDay: raw.recalibratedSprint?.startDay ?? nextStart,
    endDay: raw.recalibratedSprint?.endDay ?? nextEnd,
    adjustedPhase: raw.recalibratedSprint?.adjustedPhase,
    modifiedTasks: Array.isArray(raw.recalibratedSprint?.modifiedTasks)
      ? raw.recalibratedSprint.modifiedTasks
      : [],
    pedagogicalChanges: {
      restDaysAdded: Array.isArray(raw.recalibratedSprint?.pedagogicalChanges?.restDaysAdded)
        ? raw.recalibratedSprint.pedagogicalChanges.restDaysAdded
        : [],
      reviewDaysAdded: Array.isArray(raw.recalibratedSprint?.pedagogicalChanges?.reviewDaysAdded)
        ? raw.recalibratedSprint.pedagogicalChanges.reviewDaysAdded
        : [],
      difficultyReduction: raw.recalibratedSprint?.pedagogicalChanges?.difficultyReduction ?? false,
      intensityIncrease: raw.recalibratedSprint?.pedagogicalChanges?.intensityIncrease ?? false,
    },
    personalizedMessage: raw.recalibratedSprint?.personalizedMessage ?? ''
  };

  return { checkpointAnalysis: ca, recalibratedSprint: rs };
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Determine if a checkpoint should trigger (every N days)
 */
export function shouldTriggerCheckpoint(currentDay: number, checkpointInterval: number = 14): boolean {
  return currentDay > 0 && currentDay % checkpointInterval === 0;
}

/**
 * Convert store Task[] → CompletedTaskFeedback[]
 */
export function convertToFeedback(tasks: Task[]): CompletedTaskFeedback[] {
  return tasks.map(task => ({
    dayNumber: task.day ?? task.dayNumber ?? 1,
    title: task.title,
    difficultyRating: task.difficultyRating ?? 3,
    completionTime: task.actualDuration ?? task.duration,
    userComment: task.userComment,
    skipped: task.skipped,
    skipReason: task.skipReason
  }));
}

// ============================================================
// WEEKLY RECALIBRATION (new — replaces 14-day sprint model)
// ============================================================

const AGENT5_WEEKLY_SYSTEM_PROMPT = `You are Agent 5: The Recalibrator — a performance-aware curriculum coach.

Your job: analyse a pre-computed performance snapshot and weekly check-in answers to produce a stone-aware, data-driven plan for the NEXT WEEK (7 days).

## Recalibration Statuses
- ACCELERATE — user is ahead; compress timeline, introduce challenge
- MAINTAIN — on track; preserve structure, add variety
- SIMPLIFY — struggling technically; reduce scope, add scaffolding
- RECOVER — burnout / skip streak detected; protect motivation, shrink load

## Core Rules
1. The STATUS is provided — trust it. Your job is to apply it, not re-derive it.
2. The Stone Directive is provided — it must be reflected in the week plan and personalizedMessage.
3. If weekly check-in says "too fast" → reduce intensity regardless of completion rate.
4. If specific topics were hard → add more practice on those areas in the new week.
5. ALWAYS generate exactly 7 days. Day 7 is ALWAYS type "rest".
6. Never skip foundational skills — adjust PACE, not CONTENT.
7. personalizedMessage must be warm, second-person, concrete, and 2–3 sentences.
8. Return ONLY valid JSON. No markdown, no code blocks.`;

export async function recalibrateWeek(input: Agent5WeeklyInput): Promise<Agent5WeeklyOutput> {
  const { context, roadmap, stoneProfile, completedTasks, currentDay, weekNumber, weeklyCheckInAnswers, thresholds = DEFAULT_THRESHOLDS } = input;

  // Pre-compute signals using per-user adaptive thresholds
  const signals = computeSignals(completedTasks, context.dailyMinutes, thresholds);
  const { status } = signals;

  // Stone directive
  const primaryStone = stoneProfile.stoneProfile.primaryStone;
  const stoneDirective = STONE_RECALIBRATION_MATRIX[primaryStone]?.[status] ??
    `Apply ${status} recalibration strategy for a learner with ${primaryStone} stone.`;

  // RAG fetch for recovery science
  let ragContext = '';
  if (status === 'SIMPLIFY' || status === 'RECOVER') {
    try {
      const query = status === 'RECOVER'
        ? `burnout recovery habit formation ${context.goal}`
        : `learning plateau difficulty reduction scaffolding ${context.goal}`;
      const ragFn = flags.USE_HYBRID_RAG ? retrieveKnowledgeHybrid : retrieveKnowledgeSemantic;
      const ragString = await ragFn({ query, matchCount: 3 });
      ragContext = ragString ? `\n## Recovery Science (RAG)\n${ragString}` : '';
    } catch {
      // non-fatal
    }
  }

  // Sprint memory injection (Agent Memory RAG) + Behavioral RAG (Change 1)
  let historicalSection = '';
  let behavioralSection = '';
  await Promise.all([
    // Existing: longitudinal sprint narratives
    (async () => {
      if (!flags.USE_AGENT_MEMORY) return;
      try {
        const memQuery = `performance history ${context.goal} ${primaryStone} sprint recalibration`;
        const memories = await retrieveSprintMemories(memQuery);
        historicalSection = memories ? `\n## Historical Sprint Memory\n${memories}\n` : '';
      } catch { /* non-fatal */ }
    })(),
    // New: behavioral patterns (Change 1)
    (async () => {
      if (!flags.USE_BEHAVIORAL_RAG) return;
      try {
        const { retrieveBehavioralPatterns } = await import('@core/rag');
        const patterns = await retrieveBehavioralPatterns({
          query:        `${status} recalibration ${primaryStone} ${context.goal}`,
          stoneProfile,
          matchCount:   2,
        });
        behavioralSection = patterns ? `\n## Behavioral Patterns (What Worked)\n${patterns}\n` : '';
      } catch { /* non-fatal */ }
    })(),
  ]);

  // Roadmap summary
  const roadmapSummary = roadmap.months.map(m =>
    `Month ${m.month} "${m.title}": Weeks ${m.startWeek}–${m.endWeek} — ${m.primaryGoals.slice(0, 2).join(', ')}`
  ).join('\n');

  const nextStart = currentDay + 1;
  const nextEnd = Math.min(currentDay + 7, roadmap.totalDays);
  const nextWeekNumber = weekNumber + 1;

  const checkInSection = weeklyCheckInAnswers
    ? `
USER'S WEEK ${weekNumber} CHECK-IN ANSWERS:
- How pacing felt: "${weeklyCheckInAnswers.pacing}"
- What felt hard: "${weeklyCheckInAnswers.hardTopics}"
- Task types feedback: "${weeklyCheckInAnswers.taskTypesFeedback}"

Use these qualitative answers alongside performance signals. If pacing was "too fast" → reduce intensity regardless of completion rate. If specific topics were hard → add more practice on those areas in the new week.
`
    : '';

  const userPrompt = `## Weekly Recalibration Request — Week ${nextWeekNumber}

### Learner
- Goal: ${context.goal}
- Day: ${currentDay} of ${context.timeline}
- Daily budget: ${context.dailyMinutes} min
- Completed Week: ${weekNumber}

### Roadmap (summary)
${roadmapSummary}

### Stone Profile
- Archetype: ${stoneProfile.stoneProfile.userArchetype}
- Primary stone: ${primaryStone}
- All stones: ${stoneProfile.stoneProfile.stones.map(s => `${s.type} (${s.severity})`).join(', ')}
- Agent 5 note: ${stoneProfile.stoneProfile.agent5Note}

### Performance Signals (last 7 days)
- STATUS: **${status}**
- Completion rate: ${signals.completionRate.toFixed(1)}%  (${signals.completedCount}/${signals.totalTasks} tasks)
- Avg difficulty: ${signals.avgDifficulty.toFixed(2)}/5
- Consecutive skips (max streak): ${signals.consecutiveSkips}
- Struggling areas (rated 4-5): ${signals.strugglingAreas.join(', ') || 'none'}
- Mastering areas (rated 1-2): ${signals.masteringAreas.join(', ') || 'none'}

### Stone Directive for ${status}
${stoneDirective}
${ragContext}
${historicalSection}
${behavioralSection}
${checkInSection}

### Task
Generate a recalibrated week plan for Days ${nextStart}–${nextEnd} (Week ${nextWeekNumber}).
Map STATUS to: ACCELERATE→excelling, MAINTAIN→on-track, SIMPLIFY→struggling, RECOVER→struggling.
Map paceAdjustment: ACCELERATE→accelerate, MAINTAIN→maintain, SIMPLIFY/RECOVER→slow-down.
Return JSON only.

OUTPUT FORMAT — return ONLY valid JSON:
{
  "checkpointAnalysis": {
    "checkpointDay": ${currentDay},
    "overallMastery": "struggling|on-track|excelling",
    "strugglingAreas": ["..."],
    "masteringAreas": ["..."],
    "paceAdjustment": "slow-down|maintain|accelerate",
    "motivationalInsights": "...",
    "recommendations": ["..."],
    "nextSprintFocus": "..."
  },
  "recalibratedWeek": {
    "weekNumber": ${nextWeekNumber},
    "title": "<specific week title>",
    "theme": "<what this week focuses on>",
    "startDay": ${nextStart},
    "endDay": ${nextEnd},
    "paceAdjustment": "slow-down|maintain|accelerate",
    "rationale": "<why these adjustments based on signals + check-in>",
    "personalizedMessage": "<warm 2-3 sentence message to the user>",
    "days": [
      { "day": ${nextStart}, "weekDay": 1, "type": "learning", "title": "...", "theme": "...", "intensity": 0.3, "focusArea": "..." },
      { "day": ${nextStart + 1}, "weekDay": 2, "type": "practice", "title": "...", "theme": "...", "intensity": 0.35, "focusArea": "..." },
      { "day": ${nextStart + 2}, "weekDay": 3, "type": "practice", "title": "...", "theme": "...", "intensity": 0.4, "focusArea": "..." },
      { "day": ${nextStart + 3}, "weekDay": 4, "type": "reflection", "title": "...", "theme": "...", "intensity": 0.2, "focusArea": "..." },
      { "day": ${nextStart + 4}, "weekDay": 5, "type": "practice", "title": "...", "theme": "...", "intensity": 0.45, "focusArea": "..." },
      { "day": ${nextStart + 5}, "weekDay": 6, "type": "challenge", "title": "...", "theme": "...", "intensity": 0.5, "focusArea": "..." },
      { "day": ${nextEnd}, "weekDay": 7, "type": "rest", "title": "Rest & Consolidation", "theme": "Active rest", "intensity": 0.1, "focusArea": "recovery" }
    ]
  }
}`;

  let response: string;
  if (flags.USE_AGENT_TOOL_CALLING) {
    // Tool-use loop — Agent 5 reasons via tools, then produces JSON
    const { makeRecalibratorToolHandler, RECALIBRATOR_TOOL_SCHEMAS } = await import('@lib/agentTools');
    const toolHandler = makeRecalibratorToolHandler(completedTasks, context.dailyMinutes);
    const systemWithInstructions = AGENT5_WEEKLY_SYSTEM_PROMPT + `

TOOL USE INSTRUCTIONS:
1. Call compute_performance_signals first to get deterministic performance metrics.
2. Call get_stone_recalibration_directives for the primary stone + derived status.
3. If USE_BEHAVIORAL_RAG is available, call retrieve_behavioral_context.
4. Synthesize all tool outputs, then produce the JSON recalibration plan.`;

    const toolMessages = [
      { role: 'user' as const, content: userPrompt },
    ];

    let toolResult: { finalText: string };
    if (flags.USE_CLAUDE_FOR_RECALIBRATION) {
      toolResult = await callStrategicWithTools({
        messages:      toolMessages,
        systemPrompt:  systemWithInstructions,
        tools:         RECALIBRATOR_TOOL_SCHEMAS,
        toolHandler,
        temperature:   0.3,
        max_tokens:    4000,
      });
    } else {
      // Groq tool-use — single-shot function calling (no multi-turn)
      const { callWithTools } = await import('@lib/ai-router');
      const { toGroqTools } = await import('@lib/agentTools');
      const groqTools = toGroqTools(RECALIBRATOR_TOOL_SCHEMAS);
      // Run compute_performance_signals deterministically and inject result
      const sigJson = await toolHandler('compute_performance_signals', { tasks: completedTasks, dailyBudget: context.dailyMinutes });
      const sigNote = `\n\nPERFORMANCE SIGNALS (pre-computed):\n${sigJson}\n\nProceed to generate the recalibration JSON.`;
      const args = await callWithTools({
        messages:  [
          { role: 'system', content: AGENT5_WEEKLY_SYSTEM_PROMPT },
          { role: 'user',   content: userPrompt + sigNote },
        ],
        tools:     groqTools,
        tool_name: 'generate_recalibration_plan',
        temperature: 0.3,
        max_tokens:  4000,
      }, 'reasoning');
      toolResult = { finalText: args };
    }

    if (!toolResult.finalText) throw new Error('Agent 5 Weekly (tool-use): returned no response');
    response = toolResult.finalText;
  } else if (flags.USE_AGENT5_COT) {
    // Pass 1 — chain-of-thought reasoning (no JSON output)
    let cotText = '';
    try {
      const { content: cotContent } = await callReasoning({
        messages: [
          { role: 'system', content: AGENT5_WEEKLY_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt + '\n\nThink step-by-step about what adjustments are needed. Analyse the signals, stone directives, and check-in answers carefully. Do NOT output JSON yet.' },
        ],
        temperature: 0.6,
        max_tokens: 800,
      });
      cotText = cotContent ?? '';
    } catch {
      // CoT failed — fall through to single-pass below
    }

    // Pass 2 — produce JSON with CoT as assistant context
    const pass2Messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: AGENT5_WEEKLY_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
      ...(cotText
        ? [
            { role: 'assistant' as const, content: cotText },
            { role: 'user' as const, content: 'Based on your analysis, generate the recalibration plan as valid JSON.' },
          ]
        : []),
    ];
    const { content: jsonContent } = await callReasoning({
      messages: pass2Messages,
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });
    if (!jsonContent) throw new Error('Agent 5 Weekly: returned no response');
    response = jsonContent;
  } else if (flags.USE_CLAUDE_FOR_RECALIBRATION) {
    // Claude strategic call — better reasoning on complex recalibration
    const { content: claudeResponse } = await callStrategic({
      messages: [
        { role: 'system', content: AGENT5_WEEKLY_SYSTEM_PROMPT },
        { role: 'user',   content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens:  4000,
    });
    if (!claudeResponse) throw new Error('Agent 5 Weekly (Claude): returned no response');
    response = claudeResponse;
  } else {
    const { content: singleResponse } = await callReasoning({
      messages: [
        { role: 'system', content: AGENT5_WEEKLY_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });
    if (!singleResponse) throw new Error('Agent 5 Weekly: returned no response');
    response = singleResponse;
  }

  const parsed = JSON.parse(response) as Record<string, unknown>;

  // Normalize checkpointAnalysis
  const ca = (parsed.checkpointAnalysis as Record<string, unknown>) ?? {};
  const checkpointAnalysis: CheckpointAnalysis = {
    checkpointDay: typeof ca.checkpointDay === 'number' ? ca.checkpointDay : currentDay,
    overallMastery: (ca.overallMastery as CheckpointAnalysis['overallMastery']) ?? 'on-track',
    strugglingAreas: Array.isArray(ca.strugglingAreas) ? ca.strugglingAreas as string[] : signals.strugglingAreas,
    masteringAreas: Array.isArray(ca.masteringAreas) ? ca.masteringAreas as string[] : signals.masteringAreas,
    paceAdjustment: (ca.paceAdjustment as CheckpointAnalysis['paceAdjustment']) ?? 'maintain',
    motivationalInsights: typeof ca.motivationalInsights === 'string' ? ca.motivationalInsights : '',
    recommendations: Array.isArray(ca.recommendations) ? ca.recommendations as string[] : [],
    nextSprintFocus: typeof ca.nextSprintFocus === 'string' ? ca.nextSprintFocus : '',
  };

  // Normalize recalibratedWeek
  const rw = (parsed.recalibratedWeek as Record<string, unknown>) ?? {};
  const validDayTypes = ['learning', 'practice', 'reflection', 'challenge', 'retrieval', 'rest'] as const;
  const rawDays = Array.isArray(rw.days) ? rw.days : [];
  const days: WeekDay[] = rawDays.map((d: unknown, di: number) => {
    const day = (typeof d === 'object' && d !== null ? d : {}) as Record<string, unknown>;
    return {
      day:       typeof day.day       === 'number' ? day.day       : nextStart + di,
      weekDay:   typeof day.weekDay   === 'number' ? day.weekDay   : di + 1,
      type:      (validDayTypes as readonly string[]).includes(day.type as string)
        ? (day.type as WeekDay['type'])
        : (di === 6 ? 'rest' : 'practice'),
      title:     typeof day.title     === 'string' ? day.title     : `Day ${di + 1}`,
      theme:     typeof day.theme     === 'string' ? day.theme     : '',
      intensity: typeof day.intensity === 'number' ? Math.min(1, Math.max(0, day.intensity)) : (di === 6 ? 0.1 : 0.35),
      focusArea: typeof day.focusArea === 'string' ? day.focusArea : (di === 6 ? 'recovery' : 'general'),
    };
  });

  // Ensure 7 days minimum and enforce rest on day 7
  while (days.length < 7) {
    const di = days.length;
    days.push({
      day: nextStart + di,
      weekDay: di + 1,
      type: di === 6 ? 'rest' : 'practice',
      title: di === 6 ? 'Rest & Consolidation' : `Day ${di + 1}`,
      theme: di === 6 ? 'Active rest' : '',
      intensity: di === 6 ? 0.1 : 0.3,
      focusArea: di === 6 ? 'recovery' : 'general',
    });
  }
  if (days[6]) {
    days[6] = { ...days[6], type: 'rest', intensity: Math.min(days[6].intensity, 0.2) };
  }

  const recalibratedWeek: RecalibratedWeek = {
    weekNumber:          typeof rw.weekNumber         === 'number' ? rw.weekNumber         : nextWeekNumber,
    title:               typeof rw.title              === 'string' ? rw.title              : `Week ${nextWeekNumber}`,
    theme:               typeof rw.theme              === 'string' ? rw.theme              : '',
    startDay:            typeof rw.startDay           === 'number' ? rw.startDay           : nextStart,
    endDay:              typeof rw.endDay             === 'number' ? rw.endDay             : nextEnd,
    paceAdjustment:      (rw.paceAdjustment as RecalibratedWeek['paceAdjustment']) ?? 'maintain',
    rationale:           typeof rw.rationale          === 'string' ? rw.rationale          : '',
    personalizedMessage: typeof rw.personalizedMessage === 'string' ? rw.personalizedMessage : '',
    days,
  };

  // ── Stone Evolution (DYNAMIC_STONE_EVOLUTION) ─────────────────────────────
  let evolvedStoneProfile: import('@types-app/agents').Agent2ProfileOutput | undefined;
  if (flags.DYNAMIC_STONE_EVOLUTION) {
    const { evolveStoneProfile, buildSprintObservation } = await import('@lib/stoneEvolution');
    const obs = buildSprintObservation({
      completionRate:      signals.completionRate,
      consecutiveSkips:    signals.consecutiveSkips,
      timeSkips:           signals.timeSkips,
      difficultySkips:     signals.difficultySkips,
      healthSkips:         signals.healthSkips,
      avgDifficulty:       signals.avgDifficulty,
      publicArtifactsMade: completedTasks.filter(t => t.completed && (t.skipReason == null)).length,
      streakDays:          Math.max(7 - signals.consecutiveSkips, 0),
      sprintNumber:        weekNumber,
      status,
    });
    evolvedStoneProfile = evolveStoneProfile(stoneProfile, obs);
  }

  return { checkpointAnalysis, recalibratedWeek, evolvedStoneProfile };
}
