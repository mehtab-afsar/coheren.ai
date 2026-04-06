/**
 * MI-Based Adaptive Interview Engine
 *
 * Implements Motivational Interviewing (OARS) + Computer Adaptive Testing (CAT)
 * to replace 3 static questions with a 5-7 question dynamic interview.
 *
 * Research basis:
 *   - Miller & Rollnick (2012) — MI OARS framework
 *   - Funnel technique: broad open → reflective follow-up → diagnostic close
 *   - Bickman et al. (1999) CAT — 5-7 adaptive questions ≈ accuracy of 20 static
 *   - Rollnick et al. (2025) — MI chatbot achieved 98% fidelity to MI standards
 *
 * Architecture:
 *   Each topic block follows: Open → Reflect → Close
 *   The engine selects the next block based on detected stones and unanswered topics.
 *   Stops at MAX_QUESTIONS or when primary stone confidence ≥ CONFIDENCE_THRESHOLD.
 *
 * Used by Agent 2 when USE_ADAPTIVE_INTERVIEW flag is on.
 */

import type { StoneType } from '@types-app/agents';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_QUESTIONS        = 7;
const CONFIDENCE_THRESHOLD = 0.8;  // Stop early when any stone reaches this confidence

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InterviewState {
  questionNumber:        number;
  askedTopics:           Set<string>;
  detectedStones:        Map<StoneType, number>;   // provisional confidence 0-1
  changeVsSustainSignal: 'change' | 'sustain' | 'mixed';
  hedgeDensity:          number;   // rolling average across all answers so far
  readinessScore:        { importance: number; selfEfficacy: number };
  shouldContinue:        boolean;
  collectedAnswers:      Array<{ topic: string; question: string; answer: string }>;
}

export interface NextQuestion {
  question:       string;
  questionType:   'open' | 'reflective' | 'diagnostic' | 'scale';
  topic:          string;
  branchingLogic: string;   // Human-readable note on why this question was chosen
}

// ─── Question blocks (Funnel Technique) ──────────────────────────────────────
//
// Each block has: open → reflective → close
// The engine selects the LEVEL of question based on which phase the interview is in.
// Early questions are open; later questions are diagnostic closes.

interface QuestionBlock {
  topic:       string;
  priority:    number;           // 1 = always ask first; higher = defer if high confidence
  stone_probe: StoneType[];      // Which stones this block probes
  open:        string;
  reflective:  string;           // Follows up on what they said
  close:       string;           // Specific diagnostic question
  branch_if_yes?: string;        // Follow-up if answer is affirmative
  branch_if_no?:  string;        // Follow-up if answer is negative
}

const QUESTION_BLOCKS: QuestionBlock[] = [
  {
    topic:       'goal_reality',
    priority:    1,
    stone_probe: ['UnrealisticExpectations', 'TimeConstraint', 'SkillGap'],
    open:        'Walk me through what a typical week looks like for you right now — what\'s taking up most of your time?',
    reflective:  'It sounds like [paraphrase their answer]. Given that, how do you see this goal fitting into that?',
    close:       'On a scale of 1 to 10, how confident are you that you can actually make consistent time for this?',
  },
  {
    topic:       'past_attempts',
    priority:    2,
    stone_probe: ['Inconsistency', 'ProcrastinationPattern', 'FearOfFailure', 'Perfectionism'],
    open:        'Have you tried working toward something like this before? What happened?',
    reflective:  'When things fell apart — was it gradual, or more of a sudden stop?',
    close:       'When it stopped, did you feel relief, frustration, guilt — or something else?',
    branch_if_yes: 'What was different about the times it actually worked, even briefly?',
    branch_if_no:  'What has made it hard to start until now?',
  },
  {
    topic:       'daily_reality',
    priority:    3,
    stone_probe: ['TimeConstraint', 'EnvironmentFriction', 'ResourceGap'],
    open:        'What does your day actually look like — where would this habit realistically live?',
    reflective:  'So you\'re thinking [time/context they mentioned]. What could get in the way of that?',
    close:       'If something unexpected came up and you had to skip a day, what happens the day after?',
  },
  {
    topic:       'failure_relationship',
    priority:    4,
    stone_probe: ['FearOfFailure', 'Perfectionism', 'LowConfidence'],
    open:        'When something you\'re working on isn\'t going well, what do you usually do?',
    reflective:  'It sounds like [mirror what they said]. Does that tend to work for you?',
    close:       'When you imagine sharing your progress — even early, imperfect progress — with someone, what comes up for you?',
  },
  {
    topic:       'environment_and_support',
    priority:    5,
    stone_probe: ['EnvironmentFriction', 'ResourceGap', 'Overcommitment'],
    open:        'Do the people around you — at home or work — tend to support what you\'re doing, or is it more neutral or complicated?',
    reflective:  'And the space where you\'d actually do this — is it set up in a way that makes it easy, or does it need some work?',
    close:       'What\'s the single biggest thing standing between you and starting right now?',
  },
  {
    topic:       'focus_and_energy',
    priority:    6,
    stone_probe: ['FocusFragility', 'CognitiveFatigue', 'Overcommitment'],
    open:        'When you sit down to focus on something that matters, how long can you typically stay with it before your attention drifts?',
    reflective:  'Is there a time of day when that\'s better, and a time when it\'s much worse?',
    close:       'How many other things are you actively working on or committed to right now?',
  },
  {
    topic:       'self_belief',
    priority:    7,
    stone_probe: ['LowConfidence', 'FearOfFailure', 'UnrealisticExpectations'],
    open:        'Honestly — do you believe you\'re the kind of person who can actually do this?',
    reflective:  'What would make you feel like you genuinely have what it takes?',
    close:       'What would it mean for you personally if this finally worked?',
  },
];

// ─── Readiness ruler questions (always asked — not counted in the 5-7 block) ─

export const READINESS_RULER_QUESTIONS = {
  importance:
    'On a scale of 1 to 10, how important is achieving this to you right now — not how important it "should" be, but how much you genuinely feel it?',
  selfEfficacy:
    'And on a scale of 1 to 10, how confident are you that you could actually succeed if you committed to this properly?',
};

// ─── State factory ────────────────────────────────────────────────────────────

export function createInterviewState(): InterviewState {
  return {
    questionNumber:        0,
    askedTopics:           new Set(),
    detectedStones:        new Map(),
    changeVsSustainSignal: 'mixed',
    hedgeDensity:          0,
    readinessScore:        { importance: 0, selfEfficacy: 0 },
    shouldContinue:        true,
    collectedAnswers:      [],
  };
}

// ─── State update helpers ─────────────────────────────────────────────────────

/**
 * Update stone confidence in state from external signal.
 * Confidence is capped at 0.99 and floored at 0.
 */
export function updateStoneConfidence(
  state: InterviewState,
  stone: StoneType,
  delta: number
): void {
  const current = state.detectedStones.get(stone) ?? 0;
  state.detectedStones.set(stone, Math.min(0.99, Math.max(0, current + delta)));
}

/**
 * Recompute shouldContinue based on current state.
 * Stops if: max questions reached, or top stone ≥ threshold with 5+ questions asked.
 */
export function recomputeShouldContinue(state: InterviewState): void {
  if (state.questionNumber >= MAX_QUESTIONS) {
    state.shouldContinue = false;
    return;
  }
  if (state.questionNumber >= 5) {
    const maxConfidence = Math.max(0, ...state.detectedStones.values());
    if (maxConfidence >= CONFIDENCE_THRESHOLD) {
      state.shouldContinue = false;
      return;
    }
  }
  state.shouldContinue = true;
}

// ─── Core: next question selection ───────────────────────────────────────────

/**
 * Given the current state and the text of the previous answer, return
 * the next question to ask.
 *
 * Selection logic:
 *   1. If readiness ruler not yet asked, ask importance first, then selfEfficacy.
 *   2. Pick the highest-priority unasked block.
 *   3. Within a block, question level is determined by phase:
 *      - questionNumber 1-2 → open
 *      - questionNumber 3-4 → reflective
 *      - questionNumber 5+  → close (diagnostic)
 *   4. If the top detected stone matches a block with higher priority, jump to it.
 */
export function getNextQuestion(
  state:          InterviewState,
  previousAnswer: string,
): NextQuestion {
  // Determine question phase within the interview
  const phase: 'open' | 'reflective' | 'diagnostic' =
    state.questionNumber <= 2 ? 'open' :
    state.questionNumber <= 4 ? 'reflective' :
    'diagnostic';

  // Find the highest-priority unasked block
  const available = QUESTION_BLOCKS
    .filter(b => !state.askedTopics.has(b.topic))
    .sort((a, b) => {
      // Boost priority of blocks that probe currently-high-confidence stones
      const aBoost = b.stone_probe.some(s => (state.detectedStones.get(s) ?? 0) > 0.3) ? -1 : 0;
      const bBoost = a.stone_probe.some(s => (state.detectedStones.get(s) ?? 0) > 0.3) ? -1 : 0;
      return (a.priority + aBoost) - (b.priority + bBoost);
    });

  if (available.length === 0) {
    // All blocks exhausted — use a general close
    return {
      question:       'Is there anything important about your situation that you feel I haven\'t asked about yet?',
      questionType:   'open',
      topic:          'catch_all',
      branchingLogic: 'All topic blocks exhausted — open close to surface remaining signals',
    };
  }

  const block = available[0];

  // Select question text based on interview phase
  let questionText: string;
  let questionType: NextQuestion['questionType'];

  if (phase === 'open') {
    questionText = block.open;
    questionType = 'open';
  } else if (phase === 'reflective') {
    // Personalise the reflective question by injecting a brief paraphrase hint
    questionText = block.reflective.replace(
      '[paraphrase their answer]',
      previousAnswer.length > 10
        ? `"${previousAnswer.slice(0, 80).trim()}..."`
        : 'what you described'
    ).replace(
      '[time/context they mentioned]',
      previousAnswer.length > 5 ? `"${previousAnswer.slice(0, 60).trim()}"` : 'that window'
    ).replace(
      '[mirror what they said]',
      previousAnswer.length > 5 ? `"${previousAnswer.slice(0, 60).trim()}"` : 'what you described'
    );
    questionType = 'reflective';
  } else {
    // Late interview: use close (diagnostic)
    questionText = block.close;
    questionType = 'diagnostic';
  }

  const branchingLogic = [
    `Topic: ${block.topic}`,
    `Phase: ${phase}`,
    `Probing stones: ${block.stone_probe.join(', ')}`,
    `Question #${state.questionNumber + 1} of max ${MAX_QUESTIONS}`,
    state.detectedStones.size > 0
      ? `Top stone so far: ${getTopStone(state.detectedStones) ?? 'none'}`
      : 'No stones detected yet',
  ].join(' | ');

  return { question: questionText, questionType, topic: block.topic, branchingLogic };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTopStone(stones: Map<StoneType, number>): StoneType | null {
  let top: StoneType | null = null;
  let max = 0;
  for (const [stone, conf] of stones) {
    if (conf > max) { max = conf; top = stone; }
  }
  return top;
}

/**
 * Mark a topic as asked and record the answer in state.
 * Call this AFTER receiving the user's answer to a question.
 */
export function recordAnswer(
  state:    InterviewState,
  topic:    string,
  question: string,
  answer:   string
): void {
  state.askedTopics.add(topic);
  state.questionNumber += 1;
  state.collectedAnswers.push({ topic, question, answer });
  recomputeShouldContinue(state);
}

/**
 * Derive readiness profile interpretation from scores.
 * Used by stone-extractor to adjust stone priors before LLM call.
 */
export function interpretReadiness(importance: number, selfEfficacy: number): {
  flags:   string[];
  priors:  Partial<Record<StoneType, number>>;
} {
  const flags:  string[] = [];
  const priors: Partial<Record<StoneType, number>> = {};

  if (importance < 6) {
    flags.push('LOW_IMPORTANCE');
    priors['UnrealisticExpectations'] = 0.2;   // Says they want it but don't feel it
  }
  if (selfEfficacy < 5) {
    flags.push('LOW_SELF_EFFICACY');
    priors['LowConfidence'] = 0.25;
  }
  if (importance >= 7 && selfEfficacy < 5) {
    flags.push('CLASSIC_FEAR_OF_FAILURE');
    priors['FearOfFailure'] = (priors['FearOfFailure'] ?? 0) + 0.25;
  }
  if (importance >= 8 && selfEfficacy >= 8) {
    flags.push('HIGH_READINESS');
    // High readiness reduces Inconsistency if it was provisionally detected
    priors['Inconsistency'] = -0.15;           // Negative delta — reduce confidence
  }
  if (importance < 6 && selfEfficacy < 6) {
    flags.push('CONTEMPLATION_STAGE');          // TTM stage signal — use in changeStage detection
  }

  return { flags, priors };
}
