/**
 * Fallback Task Generator
 *
 * Deterministic, LLM-free task generation using Agent 3 phase data and stone profile.
 * Called when Agent 4 (task-generator) fails due to rate limits, network errors, or
 * repeated bad JSON that exhausts all retries.
 *
 * Design principles:
 *   - Zero API calls — always succeeds
 *   - Uses real phase data (primaryGoals, keyMilestones, focusAreas)
 *   - Applies the same stone delivery rules as Agent 4 (starter steps, time-boxing, etc.)
 *   - Output is a valid DailyTask consumed by the same UI as Agent 4 output
 */

import type {
  Agent2ProfileOutput,
  Agent3Output,
  DailyTask,
  Phase,
  StoneType,
  TaskStep,
} from '@types-app/agents';

// ─── Phase Resolution ─────────────────────────────────────────────────────────

function resolvePhase(phases: Phase[], dayNumber: number): { phase: Phase; dayInPhase: number } {
  let elapsed = 0;
  for (const phase of phases) {
    const dur = phase.durationDays ?? 14;
    if (dayNumber <= elapsed + dur) {
      return { phase, dayInPhase: dayNumber - elapsed };
    }
    elapsed += dur;
  }
  return { phase: phases[phases.length - 1], dayInPhase: dayNumber - elapsed };
}

// ─── Activity Templates per Domain (derived from primaryGoals) ────────────────

interface ActivityTemplate {
  verbs: string[];
  objects: string[];
  durations: string[]; // "15 min", "20 min", etc.
}

const DOMAIN_TEMPLATES: Record<string, ActivityTemplate> = {
  Cognitive: {
    verbs:     ['Study', 'Review', 'Practice', 'Work through', 'Summarize'],
    objects:   ['the core concept', 'yesterday\'s material', 'one example problem', 'a practice exercise', 'the key ideas'],
    durations: ['15 min', '20 min', '25 min'],
  },
  Kinesthetic: {
    verbs:     ['Complete', 'Practice', 'Drill', 'Train', 'Execute'],
    objects:   ['the basic movement', 'the technique from yesterday', 'a short practice set', 'the fundamental drill', 'a timed exercise'],
    durations: ['20 min', '25 min', '30 min'],
  },
  Career: {
    verbs:     ['Work on', 'Update', 'Draft', 'Research', 'Prepare'],
    objects:   ['one career task', 'a portfolio element', 'an outreach message', 'a skill component', 'the next action item'],
    durations: ['20 min', '30 min', '25 min'],
  },
  Financial: {
    verbs:     ['Review', 'Calculate', 'Research', 'Track', 'Analyze'],
    objects:   ['your numbers', 'one financial concept', 'a concrete example', 'your progress', 'the next principle'],
    durations: ['20 min', '15 min', '25 min'],
  },
  Creative: {
    verbs:     ['Create', 'Draft', 'Experiment with', 'Practice', 'Produce'],
    objects:   ['a rough version', 'one small piece', 'a creative exercise', 'something imperfect', 'a quick experiment'],
    durations: ['20 min', '25 min', '30 min'],
  },
  Health: {
    verbs:     ['Complete', 'Practice', 'Do', 'Follow through with', 'Try'],
    objects:   ['today\'s habit', 'the daily routine', 'one health action', 'the scheduled session', 'a small healthy step'],
    durations: ['15 min', '20 min', '25 min'],
  },
  Lifestyle: {
    verbs:     ['Work on', 'Practice', 'Complete', 'Try', 'Do'],
    objects:   ['today\'s habit', 'one small action', 'the daily exercise', 'a lifestyle step', 'the scheduled activity'],
    durations: ['15 min', '20 min', '25 min'],
  },
};

// ─── Starter Steps by Stone ───────────────────────────────────────────────────

const STARTER_STEPS: Partial<Record<StoneType, string>> = {
  ProcrastinationPattern: 'Open your materials and read the task description — that\'s the only job for the first 2 minutes.',
  Inconsistency:          'Set up your space and start a 2-minute timer. Your only job right now is to begin.',
  TimeConstraint:         'Set a 15-minute timer before reading anything else.',
  FearOfFailure:          'Remind yourself: this is an experiment. There is no right answer today — only trying.',
  Perfectionism:          'Set a timer for the full session. When it rings, you\'re done — regardless of completeness.',
  Overcommitment:         'Check that you have the time you need. If not, do the 10-minute version instead.',
};

const DEFAULT_STARTER = 'Open your materials and take one slow breath. Begin when ready.';

// ─── Tips by Stone ────────────────────────────────────────────────────────────

const STONE_TIPS: Partial<Record<StoneType, string[]>> = {
  ProcrastinationPattern: [
    'If you feel resistance, do only Step 1. That\'s a win.',
    'When [timer starts], I will [open my materials and read Step 1]. This is non-negotiable.',
  ],
  Inconsistency: [
    'Never miss twice. If you skip today, do just Step 1 tomorrow — no matter what.',
    'Partial completion counts. Even 10 minutes is real progress.',
  ],
  FearOfFailure: [
    'Permission to fail: your job today is to do the reps, not to do them well.',
    'Think of this as data collection, not performance. Every attempt teaches you something.',
  ],
  Perfectionism: [
    'Stop when the timer rings — even if it feels unfinished. Done beats perfect.',
    'Your output today doesn\'t need to be good. It needs to exist.',
  ],
  TimeConstraint: [
    'One focused block beats two distracted ones. Protect this time.',
    'If something comes up, do the 10-minute version. Momentum matters more than duration.',
  ],
};

const DEFAULT_TIPS = [
  'Focus on completion, not perfection.',
  'Any progress today is better than none.',
  'You\'re building a habit — consistency matters more than intensity.',
];

// ─── Deterministic seed for variety across days ───────────────────────────────

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function generateFallbackTask(
  dayNumber: number,
  roadmap: Agent3Output,
  stoneProfile: Agent2ProfileOutput,
  dailyTimeAvailable: number,
): DailyTask {
  const phases = roadmap.roadmap.phases;
  const { phase, dayInPhase } = resolvePhase(phases, dayNumber);

  const phaseWeek = Math.ceil(dayInPhase / 7);
  const week      = (phase.weeks?.[0] ?? 1) + phaseWeek - 1;

  const primaryStone = stoneProfile.stoneProfile.primaryStone as StoneType;

  // Infer domain from domainPedagogy (same logic as Agent 4)
  const pedagogy = roadmap.domainPedagogy?.toLowerCase() ?? '';
  let domain = 'Lifestyle';
  if      (pedagogy.includes('spaced repetition') || pedagogy.includes('interleaving'))    domain = 'Cognitive';
  else if (pedagogy.includes('periodization'))                                              domain = 'Kinesthetic';
  else if (pedagogy.includes('build') && pedagogy.includes('convert'))                     domain = 'Career';
  else if (pedagogy.includes('knowledge laddering'))                                       domain = 'Financial';
  else if (pedagogy.includes('divergent') || pedagogy.includes('convergent'))              domain = 'Creative';
  else if (pedagogy.includes('behavioral activation'))                                     domain = 'Health';

  const tpl = DOMAIN_TEMPLATES[domain] ?? DOMAIN_TEMPLATES.Lifestyle;

  // Use dayNumber as seed so each day gets a different combination
  const verb     = pick(tpl.verbs, dayNumber);
  const object   = pick(tpl.objects, dayNumber + 1);
  const durLabel = pick(tpl.durations, dayNumber + 2);

  // Derive a focused title from the phase's primary goal
  const primaryGoal = phase.primaryGoals?.[0] ?? phase.phaseName;
  const milestone   = phase.keyMilestones?.[dayInPhase % (phase.keyMilestones?.length || 1)] ?? primaryGoal;

  const isFearOfFailure  = primaryStone === 'FearOfFailure';
  const isPerfectionism  = primaryStone === 'Perfectionism';
  const isCreative       = domain === 'Creative';

  const titlePrefix = (isFearOfFailure)           ? 'Experiment: '
                    : (isPerfectionism && isCreative) ? '[ROUGH DRAFT] '
                    : '';

  const title       = `${titlePrefix}${verb} ${object} — ${phase.phaseName}`;
  const description = `Day ${dayInPhase} of ${phase.phaseName}. Focus area: ${milestone}.`;

  // ─── Steps ─────────────────────────────────────────────────────────────────

  const starterInstruction = STARTER_STEPS[primaryStone] ?? DEFAULT_STARTER;

  const steps: TaskStep[] = [
    {
      stepNumber:  1,
      instruction: starterInstruction,
      duration:    '2 min',
    },
    {
      stepNumber:  2,
      instruction: `${verb} ${object}. Focus on ${milestone}.`,
      duration:    durLabel,
    },
    {
      stepNumber:  3,
      instruction: isFearOfFailure
        ? 'Write one sentence about what you noticed — not what you did well, but what was interesting.'
        : 'Review what you covered. Note one thing you\'d do differently next time.',
      duration: '3 min',
    },
  ];

  // Add a time-box step for perfectionism
  if (isPerfectionism) {
    steps.splice(1, 0, {
      stepNumber:  2,
      instruction: `Set a timer for ${dailyTimeAvailable} minutes. When it rings, stop completely.`,
      duration:    '1 min',
    });
    // Renumber
    steps.forEach((s, i) => { s.stepNumber = i + 1; });
  }

  // ─── Success Criteria ───────────────────────────────────────────────────────

  const successCriteria = isFearOfFailure
    ? `You attempted the activity and observed something — there is no wrong answer.`
    : isPerfectionism
    ? `You worked until the timer rang and stopped when it did.`
    : `You completed the activity for at least ${Math.floor(dailyTimeAvailable * 0.6)} minutes.`;

  // ─── Tips ──────────────────────────────────────────────────────────────────

  const stoneTips = STONE_TIPS[primaryStone] ?? DEFAULT_TIPS;
  const tips = [...stoneTips, `Phase focus: ${primaryGoal}`];

  return {
    day:   dayNumber,
    phase: phase.phaseNumber,
    week,
    task: {
      title,
      description,
      estimatedMinutes:  dailyTimeAvailable,
      steps,
      tips,
      successCriteria: {
        primary: successCriteria,
        bonus:   phase.keyMilestones?.[1],
      },
      whyThisMatters:  `This session builds on ${phase.buildingOn ?? 'your foundation so far'} and advances you toward: ${primaryGoal}.`,
      resources: { primary: null, supplementary: [] },
    },
  };
}
