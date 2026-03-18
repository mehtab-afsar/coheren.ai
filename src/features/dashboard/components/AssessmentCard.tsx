import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronRight, CheckCircle, AlertTriangle, Target } from 'lucide-react';
import type { AssessmentQuestion, AssessmentResult, ConfidenceLevel } from '@types-app/agents';

interface AssessmentCardProps {
  title: string;
  description: string;
  questions: AssessmentQuestion[];
  taskType: 'challenge' | 'retrieval' | 'assessment';
  onComplete: (results: AssessmentResult[]) => void;
}

const TYPE_META: Record<string, { label: string; color: string; gradient: string }> = {
  retrieval: { label: 'Quick Recall', color: '#38bdf8', gradient: 'linear-gradient(135deg, #0c4a6e, #0369a1)' },
  challenge: { label: 'Weekly Challenge', color: '#a78bfa', gradient: 'linear-gradient(135deg, #1a0533, #2d1060)' },
  assessment: { label: 'Phase Assessment', color: '#f59e0b', gradient: 'linear-gradient(135deg, #451a03, #78350f)' },
};

const CONFIDENCE_OPTIONS: { value: ConfidenceLevel; label: string; color: string }[] = [
  { value: 'guessing', label: 'Guessing', color: '#ef4444' },
  { value: 'unsure', label: 'Unsure', color: '#f97316' },
  { value: 'confident', label: 'Confident', color: '#22c55e' },
  { value: 'certain', label: 'Certain', color: '#7c3aed' },
];

export default function AssessmentCard({
  title,
  description,
  questions,
  taskType,
  onComplete,
}: AssessmentCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<Record<string, Partial<AssessmentResult>>>({});
  const [phase, setPhase] = useState<'questions' | 'summary'>('questions');
  const [direction, setDirection] = useState(1);

  const meta = TYPE_META[taskType] ?? TYPE_META.challenge;
  const currentQ = questions[currentIndex];
  const currentResult = results[currentQ?.id];
  const hasAnswer = currentResult?.userAnswer !== undefined;
  const hasConfidence = currentResult?.confidence !== undefined;
  const isLast = currentIndex === questions.length - 1;

  const setAnswer = useCallback((questionId: string, answer: string | number) => {
    setResults(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], questionId, userAnswer: answer },
    }));
  }, []);

  const setConfidence = useCallback((questionId: string, confidence: ConfidenceLevel) => {
    setResults(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], confidence },
    }));
  }, []);

  const setSelfScore = useCallback((questionId: string, score: number) => {
    setResults(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], questionId, userAnswer: score, selfScore: score },
    }));
  }, []);

  const advance = useCallback(() => {
    if (!hasAnswer || !hasConfidence) return;
    setDirection(1);
    if (isLast) {
      setPhase('summary');
    } else {
      setCurrentIndex(i => i + 1);
    }
  }, [hasAnswer, hasConfidence, isLast]);

  const handleComplete = useCallback(() => {
    const finalResults: AssessmentResult[] = questions.map(q => {
      const r = results[q.id];
      const isCorrect = q.correctAnswer !== undefined
        ? String(r?.userAnswer) === String(q.correctAnswer)
        : undefined;
      return {
        questionId: q.id,
        userAnswer: r?.userAnswer ?? '',
        selfScore: r?.selfScore,
        correct: isCorrect,
        confidence: r?.confidence ?? 'unsure',
      };
    });
    onComplete(finalResults);
  }, [questions, results, onComplete]);

  // Summary calculations
  const totalAnswered = Object.keys(results).length;
  const correctCount = questions.filter(q => {
    const r = results[q.id];
    return q.correctAnswer !== undefined && String(r?.userAnswer) === String(q.correctAnswer);
  }).length;
  const autoGradeableCount = questions.filter(q => q.correctAnswer !== undefined).length;
  const avgSelfScore = (() => {
    const scores = Object.values(results).filter(r => r.selfScore !== undefined).map(r => r.selfScore!);
    return scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
  })();

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  if (phase === 'summary') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: meta.gradient,
          border: `1px solid ${meta.color}20`,
          borderRadius: 24,
          padding: 24,
          marginBottom: 20,
          boxShadow: `0 8px 32px ${meta.color}30`,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <CheckCircle size={40} color={meta.color} style={{ marginBottom: 12 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
            Assessment Complete
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
            {title}
          </p>
        </div>

        {/* Score Summary */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {autoGradeableCount > 0 && (
            <div style={{
              flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 12px', textAlign: 'center',
            }}>
              <p style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
                {correctCount}/{autoGradeableCount}
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Correct</p>
            </div>
          )}
          {avgSelfScore !== null && (
            <div style={{
              flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 12px', textAlign: 'center',
            }}>
              <p style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
                {avgSelfScore}/5
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Self Score</p>
            </div>
          )}
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 12px', textAlign: 'center',
          }}>
            <p style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
              {totalAnswered}/{questions.length}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Answered</p>
          </div>
        </div>

        {/* Per-question breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {questions.map((q, i) => {
            const r = results[q.id];
            const isCorrect = q.correctAnswer !== undefined
              ? String(r?.userAnswer) === String(q.correctAnswer)
              : undefined;
            return (
              <div key={q.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 12px',
              }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', width: 20 }}>Q{i + 1}</span>
                <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.3 }}>
                  {q.relatedSkill}
                </span>
                {isCorrect !== undefined ? (
                  isCorrect
                    ? <CheckCircle size={16} color="#22c55e" />
                    : <AlertTriangle size={16} color="#ef4444" />
                ) : r?.selfScore !== undefined ? (
                  <span style={{ fontSize: 12, color: meta.color, fontWeight: 600 }}>{r.selfScore}/5</span>
                ) : null}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleComplete}
          style={{
            width: '100%', padding: '14px 20px', borderRadius: 14,
            background: `linear-gradient(135deg, ${meta.color}, ${meta.color}aa)`,
            color: '#fff', border: 'none', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', boxShadow: `0 4px 14px ${meta.color}40`,
          }}
        >
          Continue
        </button>
      </motion.div>
    );
  }

  if (!currentQ) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: meta.gradient,
        border: `1px solid ${meta.color}20`,
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 8px 32px ${meta.color}30`,
      }}
    >
      {/* Header badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: `${meta.color}20`, borderRadius: 99, padding: '5px 12px',
        }}>
          {taskType === 'retrieval' ? <Brain size={13} color={meta.color} /> :
           taskType === 'assessment' ? <Target size={13} color={meta.color} /> :
           <Brain size={13} color={meta.color} />}
          <span style={{ fontSize: 11, fontWeight: 600, color: meta.color, letterSpacing: '0.04em' }}>
            {meta.label}
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
          {description}
        </span>
      </div>

      {/* Segmented progress bar */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 20 }}>
        {questions.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2, overflow: 'hidden',
            background: 'rgba(255,255,255,0.1)',
          }}>
            <motion.div
              initial={false}
              animate={{
                width: i < currentIndex ? '100%' : i === currentIndex ? '50%' : '0%',
              }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{
                height: '100%', borderRadius: 2,
                background: i <= currentIndex
                  ? `linear-gradient(90deg, ${meta.color}, ${meta.color}88)`
                  : 'transparent',
              }}
            />
          </div>
        ))}
      </div>

      {/* Question */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentQ.id}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Skill tag */}
          <p style={{
            fontSize: 10, fontWeight: 600, color: `${meta.color}cc`,
            letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px',
          }}>
            {currentQ.relatedSkill} — {currentQ.difficulty}
          </p>

          <h3 style={{
            fontSize: 'clamp(16px, 4.2vw, 19px)', fontWeight: 600, color: '#fff',
            lineHeight: 1.4, margin: '0 0 16px', letterSpacing: '-0.01em',
          }}>
            {currentQ.question}
          </h3>

          {/* Rubric (for self_rate) */}
          {currentQ.rubric && (
            <p style={{
              fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5,
              margin: '0 0 12px', fontStyle: 'italic',
            }}>
              {currentQ.rubric}
            </p>
          )}

          {/* ── Multiple Choice ── */}
          {currentQ.type === 'multiple_choice' && currentQ.options && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {currentQ.options.map((opt, idx) => {
                const isSelected = currentResult?.userAnswer === opt.value;
                return (
                  <motion.button
                    key={opt.value}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    onClick={() => setAnswer(currentQ.id, opt.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 12,
                      border: isSelected ? `2px solid ${meta.color}` : '2px solid rgba(255,255,255,0.08)',
                      background: isSelected ? `${meta.color}15` : 'rgba(255,255,255,0.04)',
                      cursor: 'pointer', textAlign: 'left', outline: 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      border: isSelected ? `5px solid ${meta.color}` : '2px solid rgba(255,255,255,0.2)',
                      background: 'transparent', transition: 'all 0.2s ease',
                    }} />
                    <span style={{ fontSize: 14, color: isSelected ? '#fff' : 'rgba(255,255,255,0.75)', fontWeight: isSelected ? 500 : 400 }}>
                      {opt.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* ── True/False ── */}
          {currentQ.type === 'true_false' && (
            <div style={{ display: 'flex', gap: 10 }}>
              {['true', 'false'].map(val => {
                const isSelected = currentResult?.userAnswer === val;
                return (
                  <button
                    key={val}
                    onClick={() => setAnswer(currentQ.id, val)}
                    style={{
                      flex: 1, padding: '14px 16px', borderRadius: 12,
                      border: isSelected ? `2px solid ${meta.color}` : '2px solid rgba(255,255,255,0.08)',
                      background: isSelected ? `${meta.color}15` : 'rgba(255,255,255,0.04)',
                      color: isSelected ? '#fff' : 'rgba(255,255,255,0.7)',
                      fontSize: 15, fontWeight: 600, cursor: 'pointer',
                      textTransform: 'capitalize', outline: 'none', transition: 'all 0.2s ease',
                    }}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Self Rate (1-5) ── */}
          {currentQ.type === 'self_rate' && (
            <div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 10 }}>
                {[1, 2, 3, 4, 5].map(val => {
                  const isSelected = currentResult?.selfScore === val;
                  return (
                    <button
                      key={val}
                      onClick={() => setSelfScore(currentQ.id, val)}
                      style={{
                        width: 48, height: 48, borderRadius: 12,
                        border: isSelected ? `2px solid ${meta.color}` : '2px solid rgba(255,255,255,0.08)',
                        background: isSelected ? `${meta.color}20` : 'rgba(255,255,255,0.04)',
                        color: isSelected ? meta.color : 'rgba(255,255,255,0.6)',
                        fontSize: 18, fontWeight: 700, cursor: 'pointer',
                        outline: 'none', transition: 'all 0.2s ease',
                      }}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                <span>Needs work</span>
                <span>Nailed it</span>
              </div>
            </div>
          )}

          {/* ── Open Ended ── */}
          {currentQ.type === 'open_ended' && (
            <textarea
              value={(currentResult?.userAnswer as string) ?? ''}
              onChange={e => setAnswer(currentQ.id, e.target.value)}
              placeholder="Share your thoughts..."
              style={{
                width: '100%', minHeight: 100, borderRadius: 12,
                padding: 14, border: '2px solid rgba(255,255,255,0.08)',
                fontSize: 14, fontFamily: 'inherit', resize: 'vertical',
                outline: 'none', background: 'rgba(255,255,255,0.04)',
                color: '#fff', lineHeight: 1.5, boxSizing: 'border-box',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = meta.color; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
            />
          )}

          {/* ── Confidence Selector ── */}
          {hasAnswer && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{ marginTop: 16 }}
            >
              <p style={{
                fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px',
              }}>
                How confident are you?
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                {CONFIDENCE_OPTIONS.map(opt => {
                  const isSelected = currentResult?.confidence === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setConfidence(currentQ.id, opt.value)}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: 10,
                        border: isSelected ? `2px solid ${opt.color}` : '2px solid rgba(255,255,255,0.06)',
                        background: isSelected ? `${opt.color}15` : 'transparent',
                        color: isSelected ? opt.color : 'rgba(255,255,255,0.45)',
                        fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        outline: 'none', transition: 'all 0.2s ease',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Next button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: hasAnswer && hasConfidence ? 1 : 0.3 }}
        style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}
      >
        <button
          onClick={advance}
          disabled={!hasAnswer || !hasConfidence}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '12px 24px', borderRadius: 12,
            background: hasAnswer && hasConfidence
              ? `linear-gradient(135deg, ${meta.color}, ${meta.color}aa)`
              : 'rgba(255,255,255,0.08)',
            color: '#fff', border: 'none', fontSize: 14, fontWeight: 600,
            cursor: hasAnswer && hasConfidence ? 'pointer' : 'default',
            boxShadow: hasAnswer && hasConfidence ? `0 4px 14px ${meta.color}30` : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          {isLast ? 'See Results' : 'Next'}
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </motion.div>
    </motion.div>
  );
}
