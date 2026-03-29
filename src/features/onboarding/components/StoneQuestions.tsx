import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { BuildingStone, StoneAnswer } from '@types-app/agents';

interface StoneQuestionsProps {
  stones: BuildingStone[];
  onComplete: (answers: StoneAnswer[]) => void;
}

export default function StoneQuestions({ stones, onComplete }: StoneQuestionsProps) {
  const [currentStoneIndex, setCurrentStoneIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { answer: string | number; impact: Record<string, unknown> }>>({});
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  const currentStone = stones[currentStoneIndex];
  const isAnswered = !!answers[currentStone?.stoneId];
  const isLast = currentStoneIndex === stones.length - 1;

  const advance = useCallback(() => {
    if (!isAnswered) return;
    setDirection(1);

    if (isLast) {
      const stoneAnswers: StoneAnswer[] = Object.entries(answers).map(([stoneId, data]) => ({
        stoneId,
        answer: data.answer,
        impact: data.impact
      }));
      onComplete(stoneAnswers);
    } else {
      setCurrentStoneIndex(i => i + 1);
    }
  }, [isAnswered, isLast, answers, onComplete]);

  const handleOptionSelect = (optionValue: string, impact: Record<string, unknown>) => {
    setAnswers(prev => ({
      ...prev,
      [currentStone.stoneId]: { answer: optionValue, impact }
    }));

    // Auto-advance for multiple choice and yes/no after a brief delay
    if (currentStone.question.type === 'multiple_choice' || currentStone.question.type === 'yes_no') {
      setDirection(1);
      setTimeout(() => {
        if (currentStoneIndex < stones.length - 1) {
          setCurrentStoneIndex(i => i + 1);
        } else {
          const newAnswers = {
            ...answers,
            [currentStone.stoneId]: { answer: optionValue, impact }
          };
          const stoneAnswers: StoneAnswer[] = Object.entries(newAnswers).map(([stoneId, data]) => ({
            stoneId,
            answer: data.answer,
            impact: data.impact
          }));
          onComplete(stoneAnswers);
        }
      }, 350);
    }
  };

  const updateTextAnswer = (val: string | number, impact: Record<string, unknown>) => {
    setAnswers(prev => ({
      ...prev,
      [currentStone.stoneId]: { answer: val, impact }
    }));
  };

  if (!currentStone) return null;

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div style={{
      maxWidth: 520,
      margin: '0 auto',
      padding: '0 20px',
    }}>
      {/* ── Segmented Progress ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
          {stones.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                overflow: 'hidden',
                background: '#e5e7eb',
              }}
            >
              <motion.div
                initial={false}
                animate={{
                  width: i < currentStoneIndex ? '100%' : i === currentStoneIndex ? '50%' : '0%',
                }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  height: '100%',
                  borderRadius: 2,
                  background: i <= currentStoneIndex
                    ? 'linear-gradient(90deg, #7c3aed, #a78bfa)'
                    : 'transparent',
                }}
              />
            </div>
          ))}
        </div>
        <p style={{
          fontSize: 12,
          color: '#9ca3af',
          margin: 0,
          fontWeight: 500,
        }}>
          Question {currentStoneIndex + 1} of {stones.length}
        </p>
      </div>

      {/* ── Question Card ── */}
      <div style={{
        background: '#fff',
        borderRadius: 24,
        boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)',
        padding: '32px 28px',
        minHeight: 360,
        height: 360,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStone.stoneId}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            {/* Question text */}
            <h2 style={{
              fontSize: 'clamp(17px, 4.5vw, 20px)',
              fontWeight: 600,
              color: '#1a1a2e',
              lineHeight: 1.4,
              margin: '0 0 8px',
              letterSpacing: '-0.02em',
            }}>
              {currentStone.question.text}
            </h2>

            {currentStone.reasoning && (
              <p style={{
                fontSize: 13,
                color: '#9ca3af',
                lineHeight: 1.55,
                margin: '0 0 24px',
              }}>
                {currentStone.reasoning}
              </p>
            )}

            {/* ── Multiple Choice Options ── */}
            {currentStone.question.type === 'multiple_choice' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {currentStone.question.options?.map((option, idx) => {
                  const isSelected = answers[currentStone.stoneId]?.answer === option.value;
                  return (
                    <motion.button
                      key={option.value}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.06 }}
                      onClick={() => handleOptionSelect(option.value, option.impact)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '14px 16px',
                        borderRadius: 14,
                        border: isSelected ? '2px solid #7c3aed' : '2px solid #f3f4f6',
                        background: isSelected ? 'rgba(124,58,237,0.04)' : '#fafafa',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#c4b5fd';
                          e.currentTarget.style.background = 'rgba(124,58,237,0.02)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#f3f4f6';
                          e.currentTarget.style.background = '#fafafa';
                        }
                      }}
                    >
                      {/* Radio circle */}
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: isSelected ? '6px solid #7c3aed' : '2px solid #d1d5db',
                        background: '#fff',
                        flexShrink: 0,
                        marginTop: 1,
                        transition: 'all 0.2s ease',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: isSelected ? '#1a1a2e' : '#374151',
                          lineHeight: 1.4,
                        }}>
                          {option.label}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* ── Yes/No ── */}
            {currentStone.question.type === 'yes_no' && (
              <div style={{ display: 'flex', gap: 10 }}>
                {['yes', 'no'].map((val) => {
                  const isSelected = answers[currentStone.stoneId]?.answer === val;
                  return (
                    <motion.button
                      key={val}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25 }}
                      onClick={() => handleOptionSelect(val, { answer: val })}
                      style={{
                        flex: 1,
                        padding: '16px 20px',
                        borderRadius: 14,
                        border: isSelected ? '2px solid #7c3aed' : '2px solid #f3f4f6',
                        background: isSelected ? 'rgba(124,58,237,0.04)' : '#fafafa',
                        cursor: 'pointer',
                        fontSize: 15,
                        fontWeight: 600,
                        color: isSelected ? '#7c3aed' : '#374151',
                        textTransform: 'capitalize',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                      }}
                    >
                      {val}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* ── Open Ended ── */}
            {currentStone.question.type === 'open_ended' && (
              <div>
                <textarea
                  value={(answers[currentStone.stoneId]?.answer as string) || ''}
                  onChange={e => updateTextAnswer(e.target.value, { answer: e.target.value })}
                  placeholder="Share your thoughts..."
                  style={{
                    width: '100%',
                    minHeight: 120,
                    borderRadius: 14,
                    padding: 16,
                    border: '2px solid #f3f4f6',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    background: '#fafafa',
                    color: '#1a1a2e',
                    lineHeight: 1.6,
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.background = '#fff'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#f3f4f6'; e.currentTarget.style.background = '#fafafa'; }}
                />
              </div>
            )}

            {/* ── Scale ── */}
            {currentStone.question.type === 'scale' && (
              <div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
                  {[1, 2, 3, 4, 5].map(val => {
                    const isSelected = answers[currentStone.stoneId]?.answer === val;
                    return (
                      <button
                        key={val}
                        onClick={() => updateTextAnswer(val, { score: val })}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          border: isSelected ? '2px solid #7c3aed' : '2px solid #f3f4f6',
                          background: isSelected ? 'rgba(124,58,237,0.08)' : '#fafafa',
                          color: isSelected ? '#7c3aed' : '#374151',
                          fontSize: 16,
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          outline: 'none',
                        }}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
                  <span>Not at all</span>
                  <span>Very much</span>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Next Button (for non-auto-advance types) ── */}
        {(currentStone.question.type === 'open_ended' || currentStone.question.type === 'scale') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isAnswered ? 1 : 0.4 }}
            style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}
          >
            <button
              onClick={advance}
              disabled={!isAnswered}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '12px 24px',
                borderRadius: 12,
                background: isAnswered ? 'linear-gradient(135deg, #7c3aed, #a78bfa)' : '#e5e7eb',
                color: '#fff',
                border: 'none',
                fontSize: 14,
                fontWeight: 600,
                cursor: isAnswered ? 'pointer' : 'default',
                boxShadow: isAnswered ? '0 4px 14px rgba(124,58,237,0.3)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {isLast ? 'Complete' : 'Next'}
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
