/**
 * AdaptiveInterview — MI-Based Dynamic Question Engine
 *
 * Replaces the static 3-5 multiple-choice stone questions with a research-backed
 * adaptive interview using Motivational Interviewing (OARS) + CAT branching.
 *
 * Active when flags.USE_ADAPTIVE_INTERVIEW is on.
 *
 * Phases:
 *   1. Interview    — 5-7 open-ended questions driven by interview-engine.ts
 *   2. Readiness    — 2 importance/self-efficacy scale questions (USE_READINESS_RULER)
 *   3. Done         — fires onComplete with StoneAnswer[] + raw texts + readiness
 *
 * Output is backward-compatible with StoneQuestions.tsx:
 *   onComplete(stoneAnswers, rawTexts, readinessProfile?)
 *
 * Design matches StoneQuestions.tsx exactly (same card, progress bar, animations).
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createInterviewState,
  getNextQuestion,
  recordAnswer,
  recomputeShouldContinue,
  READINESS_RULER_QUESTIONS,
  updateStoneConfidence,
  type InterviewState,
  type NextQuestion,
} from '@core/agents/stone-identifier/interview-engine';
import { analyzeLinguisticSignals } from '@core/agents/stone-identifier/linguistic-analyzer';
import type { StoneAnswer, ReadinessProfile, StoneType } from '@types-app/agents';
import { flags } from '@config/feature-flags';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdaptiveInterviewProps {
  onComplete: (
    stoneAnswers:     StoneAnswer[],
    rawTexts:         string[],
    readinessProfile?: ReadinessProfile,
  ) => void;
}

type Phase = 'interview' | 'readiness_importance' | 'readiness_efficacy' | 'done';

// ─── Stone type → signal mapping for confidence updates ──────────────────────

const TOPIC_STONE_MAP: Record<string, StoneType[]> = {
  goal_reality:         ['UnrealisticExpectations', 'TimeConstraint', 'SkillGap'],
  past_attempts:        ['Inconsistency', 'ProcrastinationPattern', 'FearOfFailure', 'Perfectionism'],
  daily_reality:        ['TimeConstraint', 'EnvironmentFriction', 'ResourceGap'],
  failure_relationship: ['FearOfFailure', 'Perfectionism', 'LowConfidence'],
  environment_and_support: ['EnvironmentFriction', 'ResourceGap', 'Overcommitment'],
  focus_and_energy:     ['FocusFragility', 'CognitiveFatigue', 'Overcommitment'],
  self_belief:          ['LowConfidence', 'FearOfFailure', 'UnrealisticExpectations'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function updateStateFromAnswer(state: InterviewState, answer: string, topic: string): void {
  const signals = analyzeLinguisticSignals(answer);
  const stones  = TOPIC_STONE_MAP[topic] ?? [];

  for (const stone of stones) {
    let delta = 0;
    if (signals.hedgeDensity > 0.2)       delta += 0.1;
    if (signals.changeVsSustainRatio < 0.8) delta += 0.1;
    if (signals.passiveVoiceCount >= 1)    delta += 0.05;
    if (answer.length > 30)                delta += 0.05; // elaboration = more signal
    updateStoneConfidence(state, stone, delta);
  }
  state.hedgeDensity = (state.hedgeDensity * (state.questionNumber - 1) + signals.hedgeDensity) / state.questionNumber;
  if (signals.changeVsSustainRatio < 0.8) {
    state.changeVsSustainSignal = state.changeVsSustainSignal === 'change' ? 'mixed' : 'sustain';
  } else if (signals.changeVsSustainRatio > 1.2) {
    state.changeVsSustainSignal = state.changeVsSustainSignal === 'sustain' ? 'mixed' : 'change';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdaptiveInterview({ onComplete }: AdaptiveInterviewProps) {
  const [phase, setPhase] = useState<Phase>('interview');
  const [engineState, setEngineState] = useState<InterviewState>(() => createInterviewState());
  const [currentQuestion, setCurrentQuestion] = useState<NextQuestion>(() => {
    const initial = createInterviewState();
    return getNextQuestion(initial, '');
  });
  const [answer, setAnswer]     = useState('');
  const [rulerValue, setRulerValue] = useState(0);
  const [rawTexts, setRawTexts] = useState<string[]>([]);
  const [stoneAnswers, setStoneAnswers] = useState<StoneAnswer[]>([]);
  const [readiness, setReadiness] = useState<Partial<ReadinessProfile>>({});
  const [direction, setDirection] = useState(1);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const questionNumber = engineState.questionNumber + 1; // 1-indexed for display
  const MAX_QUESTIONS = 7 + (flags.USE_READINESS_RULER ? 2 : 0);

  // Focus textarea when question changes
  useEffect(() => {
    if (phase === 'interview') {
      setTimeout(() => textAreaRef.current?.focus(), 350);
    }
  }, [currentQuestion, phase]);

  // ── Submit current interview answer ────────────────────────────────────────
  const submitAnswer = useCallback(() => {
    const trimmed = answer.trim();
    if (!trimmed) return;

    setDirection(1);

    // Update engine state
    const newState = { ...engineState };
    updateStateFromAnswer(newState, trimmed, currentQuestion.topic);
    recordAnswer(newState, currentQuestion.topic, currentQuestion.question, trimmed);
    recomputeShouldContinue(newState);

    // Collect data
    const newRaw = [...rawTexts, trimmed];
    const newAnswers = [
      ...stoneAnswers,
      { stoneId: currentQuestion.topic, answer: trimmed, impact: {} },
    ];
    setRawTexts(newRaw);
    setStoneAnswers(newAnswers);
    setEngineState(newState);
    setAnswer('');

    if (!newState.shouldContinue) {
      // Interview complete — move to readiness ruler or done
      if (flags.USE_READINESS_RULER) {
        setPhase('readiness_importance');
      } else {
        onComplete(newAnswers, newRaw, undefined);
        setPhase('done');
      }
    } else {
      // Get next question
      const next = getNextQuestion(newState, trimmed);
      setCurrentQuestion(next);
    }
  }, [answer, engineState, currentQuestion, rawTexts, stoneAnswers, onComplete]);

  // ── Submit readiness ruler answer ──────────────────────────────────────────
  const submitRulerAnswer = useCallback(() => {
    if (rulerValue < 1) return;
    setDirection(1);

    if (phase === 'readiness_importance') {
      setReadiness(r => ({ ...r, importance: rulerValue }));
      setRulerValue(0);
      setPhase('readiness_efficacy');
    } else if (phase === 'readiness_efficacy') {
      const finalReadiness: ReadinessProfile = {
        importance:   readiness.importance ?? 5,
        selfEfficacy: rulerValue,
      };
      onComplete(stoneAnswers, rawTexts, finalReadiness);
      setPhase('done');
    }
  }, [phase, rulerValue, readiness, stoneAnswers, rawTexts, onComplete]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (phase === 'interview') submitAnswer();
    }
  };

  // ── Progress calculation ───────────────────────────────────────────────────
  const totalSteps = MAX_QUESTIONS;
  const doneSteps =
    phase === 'interview'            ? engineState.questionNumber :
    phase === 'readiness_importance' ? engineState.questionNumber :
    phase === 'readiness_efficacy'   ? engineState.questionNumber + 1 :
    totalSteps;

  // ── Current display text ───────────────────────────────────────────────────
  const displayQuestion =
    phase === 'readiness_importance' ? READINESS_RULER_QUESTIONS.importance :
    phase === 'readiness_efficacy'   ? READINESS_RULER_QUESTIONS.selfEfficacy :
    currentQuestion.question;

  const displaySubtext =
    phase === 'interview' && currentQuestion.questionType === 'reflective'
      ? 'Take your time — be as honest as you like.'
      : phase === 'readiness_importance' || phase === 'readiness_efficacy'
      ? 'Be honest — 10 means truly feels that way right now, not what you think it should be.'
      : undefined;

  const slideVariants = {
    enter:  (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  const animKey =
    phase === 'readiness_importance' ? 'ruler_importance' :
    phase === 'readiness_efficacy'   ? 'ruler_efficacy' :
    `q_${engineState.questionNumber}`;

  if (phase === 'done') return null;

  // 5-dot progress (filled dots = approximate stages completed)
  const filledDots = Math.min(5, Math.round((doneSteps / totalSteps) * 5));

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 24px' }}>

      {/* ── 5 progress dots — top right ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 48 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: i < filledDots
                ? 'var(--c-accent-purple)'
                : 'var(--c-border-medium)',
              transition: 'background-color 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* ── Question + input ── */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={animKey}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Question text — Fraunces */}
          <h2 style={{
            fontFamily: 'var(--c-font-display)',
            fontSize: 'clamp(26px, 5vw, 36px)',
            fontWeight: 500,
            color: 'var(--c-text-primary)',
            lineHeight: 1.25,
            margin: '0 0 16px',
            letterSpacing: '-0.02em',
          }}>
            {displayQuestion}
          </h2>

          {displaySubtext && (
            <p style={{
              fontSize: 15,
              color: 'var(--c-text-tertiary)',
              lineHeight: 1.6,
              margin: '0 0 32px',
              fontFamily: 'var(--c-font-body)',
            }}>
              {displaySubtext}
            </p>
          )}

          {/* ── Open-ended text area (interview phase) ── */}
          {phase === 'interview' && (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: displaySubtext ? 0 : 24 }}>
              <textarea
                ref={textAreaRef}
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Take your time…"
                rows={5}
                style={{
                  width: '100%',
                  border: 'none',
                  borderBottom: '1.5px solid var(--c-border-subtle)',
                  padding: '0 0 12px',
                  fontSize: 16,
                  color: 'var(--c-text-primary)',
                  fontFamily: 'var(--c-font-body)',
                  resize: 'none',
                  outline: 'none',
                  lineHeight: 1.65,
                  background: 'transparent',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.target.style.borderBottomColor = 'var(--c-accent-purple)'; }}
                onBlur={e => { e.target.style.borderBottomColor = 'var(--c-border-subtle)'; }}
              />

              {/* Continue row — right-aligned text link */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
                {/* Skip option */}
                {engineState.questionNumber >= 2 ? (
                  <button
                    onClick={() => {
                      setAnswer('—');
                      setTimeout(submitAnswer, 50);
                    }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: 'var(--c-text-quaternary)', padding: 0,
                      fontFamily: 'var(--c-font-body)',
                    }}
                  >
                    Skip
                  </button>
                ) : <span />}

                <button
                  onClick={submitAnswer}
                  disabled={!answer.trim()}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: answer.trim() ? 'pointer' : 'not-allowed',
                    fontSize: 15,
                    fontWeight: 600,
                    color: answer.trim() ? 'var(--c-accent-purple)' : 'var(--c-text-quaternary)',
                    fontFamily: 'var(--c-font-body)',
                    padding: 0,
                    transition: 'color 0.15s',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── 1-10 Scale (readiness ruler) ── */}
          {(phase === 'readiness_importance' || phase === 'readiness_efficacy') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 32 }}>
              {/* Scale buttons 1-10 */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <motion.button
                    key={n}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setRulerValue(n)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      border: rulerValue === n
                        ? '2px solid var(--c-accent-purple)'
                        : '1.5px solid var(--c-border-subtle)',
                      background: rulerValue === n
                        ? 'var(--c-accent-purple)'
                        : 'transparent',
                      color: rulerValue === n ? '#fff' : 'var(--c-text-secondary)',
                      fontWeight: rulerValue === n ? 700 : 500,
                      fontSize: 15,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontFamily: 'var(--c-font-body)',
                    }}
                  >
                    {n}
                  </motion.button>
                ))}
              </div>

              {/* Scale labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--c-text-quaternary)', fontFamily: 'var(--c-font-body)' }}>Not at all</span>
                <span style={{ fontSize: 12, color: 'var(--c-text-quaternary)', fontFamily: 'var(--c-font-body)' }}>Absolutely</span>
              </div>

              {/* Selected value feedback */}
              {rulerValue > 0 && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    fontSize: 13,
                    color: 'var(--c-accent-purple)',
                    fontWeight: 600,
                    margin: 0,
                    fontFamily: 'var(--c-font-body)',
                  }}
                >
                  {rulerValue}/10 — {rulerValue >= 8 ? 'Strong' : rulerValue >= 5 ? 'Moderate' : 'Low'}
                </motion.p>
              )}

              {/* Continue — right-aligned */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={submitRulerAnswer}
                  disabled={rulerValue < 1}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: rulerValue > 0 ? 'pointer' : 'not-allowed',
                    fontSize: 15,
                    fontWeight: 600,
                    color: rulerValue > 0 ? 'var(--c-accent-purple)' : 'var(--c-text-quaternary)',
                    fontFamily: 'var(--c-font-body)',
                    padding: 0,
                    transition: 'color 0.15s',
                  }}
                >
                  {phase === 'readiness_importance' ? 'Next →' : 'Done →'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
