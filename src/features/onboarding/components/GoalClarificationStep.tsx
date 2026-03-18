/**
 * GoalClarificationStep
 *
 * Shown after Agent 1 detects ambiguity or an unrealistic goal.
 * Renders 2-3 focused clarifying questions one at a time (same card-per-question
 * style as StoneQuestions) plus an optional reality check banner.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import type { GoalClarificationOutput, GoalClarificationQuestion } from '@types-app/agents';

interface Props {
  clarificationOutput: GoalClarificationOutput;
  onComplete: (answers: Record<string, string>) => void;
}

export default function GoalClarificationStep({ clarificationOutput, onComplete }: Props) {
  const { questions, realityCheck } = clarificationOutput;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState(1);
  const [realityAcknowledged, setRealityAcknowledged] = useState(!realityCheck?.triggered);

  const currentQ: GoalClarificationQuestion | undefined = questions[currentIndex];
  const _isAnswered = currentQ ? !!answers[currentQ.id] : false;
  const isLast = currentIndex === questions.length - 1;

  const handleSelect = (qId: string, value: string) => {
    const newAnswers = { ...answers, [qId]: value };
    setAnswers(newAnswers);

    // Auto-advance after short delay
    setTimeout(() => {
      setDirection(1);
      if (!isLast) {
        setCurrentIndex(i => i + 1);
      } else {
        onComplete(newAnswers);
      }
    }, 320);
  };

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -50 : 50, opacity: 0 }),
  };

  // Reality check gate — show before questions
  if (!realityAcknowledged && realityCheck?.triggered) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px' }}
      >
        {/* Reality check banner */}
        <div style={{
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
          padding: '28px 24px',
        }}>
          {/* Icon + headline */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(245,158,11,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <AlertTriangle size={20} color="#d97706" strokeWidth={2} />
            </div>
            <div>
              <p style={{
                fontSize: 15,
                fontWeight: 700,
                color: '#92400e',
                margin: '0 0 4px',
                lineHeight: 1.3,
              }}>
                {realityCheck.headline}
              </p>
              <p style={{ fontSize: 13, color: '#78350f', margin: 0, lineHeight: 1.5 }}>
                {realityCheck.detail}
              </p>
            </div>
          </div>

          {/* Suggested adjustment */}
          <div style={{
            background: 'rgba(245,158,11,0.07)',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 20,
            borderLeft: '3px solid #f59e0b',
          }}>
            <p style={{ fontSize: 13, color: '#78350f', margin: 0, lineHeight: 1.5 }}>
              <strong>Our approach:</strong> {realityCheck.suggestedAdjustment}
            </p>
          </div>

          <button
            onClick={() => setRealityAcknowledged(true)}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
              color: '#fff',
              border: 'none',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
            }}
          >
            Got it — let's continue
          </button>
        </div>
      </motion.div>
    );
  }

  if (!currentQ) return null;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px' }}>
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, justifyContent: 'center' }}>
        {questions.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === currentIndex ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: i < currentIndex ? '#7c3aed' : i === currentIndex ? '#7c3aed' : '#e5e7eb',
              transition: 'all 0.3s ease',
              opacity: i < currentIndex ? 0.5 : 1,
            }}
          />
        ))}
      </div>

      {/* Question card */}
      <div style={{
        background: '#fff',
        borderRadius: 24,
        boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)',
        padding: '28px 24px',
        minHeight: 280,
      }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentQ.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Label */}
            <p style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#7c3aed',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: '0 0 10px',
            }}>
              Quick check
            </p>

            {/* Question text */}
            <h2 style={{
              fontSize: 'clamp(17px, 4.5vw, 20px)',
              fontWeight: 700,
              color: '#1a1a2e',
              lineHeight: 1.35,
              margin: '0 0 20px',
              letterSpacing: '-0.02em',
            }}>
              {currentQ.question}
            </h2>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {currentQ.options.map((opt, idx) => {
                const isSelected = answers[currentQ.id] === opt.value;
                return (
                  <motion.button
                    key={opt.value}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    onClick={() => handleSelect(currentQ.id, opt.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '13px 16px',
                      borderRadius: 14,
                      border: isSelected ? '2px solid #7c3aed' : '2px solid #f3f4f6',
                      background: isSelected ? 'rgba(124,58,237,0.04)' : '#fafafa',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.15s, background 0.15s',
                      outline: 'none',
                    }}
                  >
                    <div style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: isSelected ? '5px solid #7c3aed' : '2px solid #d1d5db',
                      background: '#fff',
                      flexShrink: 0,
                      transition: 'all 0.15s',
                    }} />
                    <span style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: isSelected ? '#1a1a2e' : '#374151',
                      lineHeight: 1.4,
                    }}>
                      {opt.label}
                    </span>
                    {isSelected && (
                      <ChevronRight size={14} color="#7c3aed" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <p style={{
        textAlign: 'center',
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 16,
      }}>
        {currentIndex + 1} of {questions.length}
      </p>
    </div>
  );
}
