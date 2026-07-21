import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Video, CheckCircle } from 'lucide-react';
import type { AssessmentResult, ConfidenceLevel } from '@types-app/agents';

interface RubricCriterion {
  id: string;
  label: string;
  description?: string;
}

interface SelfAssessmentModalProps {
  isOpen: boolean;
  taskTitle: string;
  criteria: RubricCriterion[];
  questionId: string;
  relatedSkill: string;
  onSubmit: (result: AssessmentResult) => void;
  onRetry: () => void;
  onClose: () => void;
}

export default function SelfAssessmentModal({
  isOpen,
  taskTitle,
  criteria,
  questionId,
  relatedSkill,
  onSubmit,
  onRetry,
  onClose,
}: SelfAssessmentModalProps) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [confidence, setConfidence] = useState<ConfidenceLevel | null>(null);

  const allScored = criteria.every(c => scores[c.id] !== undefined);
  const avgScore = allScored
    ? Math.round((Object.values(scores).reduce((a, b) => a + b, 0) / criteria.length) * 10) / 10
    : 0;

  const setScore = useCallback((criterionId: string, score: number) => {
    setScores(prev => ({ ...prev, [criterionId]: score }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!allScored || !confidence) return;
    onSubmit({
      questionId,
      userAnswer: avgScore,
      selfScore: Math.round(avgScore),
      confidence,
    });
  }, [allScored, confidence, avgScore, questionId, onSubmit]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '24px 24px 0 0',
              width: '100%', maxWidth: 520, maxHeight: '85vh',
              overflow: 'auto', padding: '24px 20px env(safe-area-inset-bottom, 20px)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                  Self Assessment
                </h2>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{relatedSkill}</p>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: 99, border: 'none',
                  background: '#f3f4f6', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={16} color="#6b7280" />
              </button>
            </div>

            {/* Video prompt */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#FBF3EE', borderRadius: 12, padding: '12px 14px',
              marginBottom: 20,
            }}>
              <Video size={18} color="#C4552D" />
              <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.4 }}>
                Record yourself performing the skill, then watch back before rating.
              </p>
            </div>

            {/* Task reference */}
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
              {taskTitle}
            </p>

            {/* Criteria ratings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {criteria.map(criterion => {
                const currentScore = scores[criterion.id];
                return (
                  <div key={criterion.id} style={{
                    background: '#fafafa', borderRadius: 14, padding: '14px 16px',
                    border: currentScore !== undefined ? '1px solid #F9EDE6' : '1px solid #f3f4f6',
                  }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1a2e', margin: '0 0 4px' }}>
                      {criterion.label}
                    </p>
                    {criterion.description && (
                      <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 10px', lineHeight: 1.4 }}>
                        {criterion.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[1, 2, 3, 4, 5].map(val => {
                        const isFilled = currentScore !== undefined && val <= currentScore;
                        return (
                          <button
                            key={val}
                            onClick={() => setScore(criterion.id, val)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              padding: 2, outline: 'none', transition: 'transform 0.15s ease',
                              transform: isFilled ? 'scale(1.1)' : 'scale(1)',
                            }}
                          >
                            <Star
                              size={22}
                              fill={isFilled ? '#C4552D' : 'none'}
                              color={isFilled ? '#C4552D' : '#d1d5db'}
                              strokeWidth={1.5}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Average score display */}
            {allScored && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  textAlign: 'center', marginBottom: 16,
                  background: 'linear-gradient(135deg, #FBF3EE, #F9EDE6)',
                  borderRadius: 14, padding: '16px 12px',
                }}
              >
                <p style={{ fontSize: 28, fontWeight: 700, color: '#C4552D', margin: '0 0 4px' }}>
                  {avgScore}/5
                </p>
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                  {avgScore >= 4 ? 'Great work!' : avgScore >= 3 ? 'Solid progress' : 'Keep practicing'}
                </p>
              </motion.div>
            )}

            {/* Confidence selector */}
            {allScored && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{ marginBottom: 20 }}
              >
                <p style={{
                  fontSize: 11, fontWeight: 600, color: '#9ca3af',
                  letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px',
                }}>
                  How confident are you in this rating?
                </p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([
                    { value: 'guessing' as ConfidenceLevel, label: 'Guessing', color: '#ef4444' },
                    { value: 'unsure' as ConfidenceLevel, label: 'Unsure', color: '#f97316' },
                    { value: 'confident' as ConfidenceLevel, label: 'Confident', color: '#22c55e' },
                    { value: 'certain' as ConfidenceLevel, label: 'Certain', color: '#C4552D' },
                  ]).map(opt => {
                    const isSelected = confidence === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setConfidence(opt.value)}
                        style={{
                          flex: 1, padding: '8px 4px', borderRadius: 10,
                          border: isSelected ? `2px solid ${opt.color}` : '2px solid #f3f4f6',
                          background: isSelected ? `${opt.color}08` : 'transparent',
                          color: isSelected ? opt.color : '#9ca3af',
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

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onRetry}
                style={{
                  flex: 1, padding: '14px 16px', borderRadius: 14,
                  border: '2px solid #f3f4f6', background: '#fff',
                  color: '#374151', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', outline: 'none',
                }}
              >
                Try Again
              </button>
              <button
                onClick={handleSubmit}
                disabled={!allScored || !confidence}
                style={{
                  flex: 1, padding: '14px 16px', borderRadius: 14,
                  border: 'none',
                  background: allScored && confidence
                    ? 'linear-gradient(135deg, #C4552D, #DDA189)'
                    : '#e5e7eb',
                  color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: allScored && confidence ? 'pointer' : 'default',
                  boxShadow: allScored && confidence ? '0 4px 14px rgba(196, 85, 45,0.3)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  outline: 'none', transition: 'all 0.2s ease',
                }}
              >
                <CheckCircle size={16} />
                Mark Complete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
