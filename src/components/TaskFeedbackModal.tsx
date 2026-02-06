/**
 * Task Feedback Modal
 *
 * Shown immediately after user completes a task.
 * Collects difficulty rating and feedback in < 3 seconds.
 *
 * This is the MOST CRITICAL data entry point for Agent 5 recalibration.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Zap } from 'lucide-react';
import { tokens } from '../design-system';

interface TaskFeedbackModalProps {
  isOpen: boolean;
  taskTitle: string;
  estimatedMinutes: number;
  onSubmit: (feedback: TaskFeedback) => void;
  onClose: () => void;
}

export interface TaskFeedback {
  difficultyRating: number; // 1-5
  actualDuration?: number; // minutes
  feedbackTags: string[];
  userComment?: string;
}

const DIFFICULTY_EMOJIS = [
  { value: 1, emoji: '🤩', label: 'Too Easy', color: tokens.colors.success },
  { value: 2, emoji: '😊', label: 'Easy', color: '#86EFAC' },
  { value: 3, emoji: '🙂', label: 'Just Right', color: tokens.colors.primary },
  { value: 4, emoji: '😟', label: 'Hard', color: '#FCD34D' },
  { value: 5, emoji: '😫', label: 'Too Hard', color: tokens.colors.warning }
];

const QUICK_TAGS = [
  { id: 'perfect_pace', label: '✨ Perfect pace', category: 'positive' },
  { id: 'already_knew', label: '💡 Already knew this', category: 'easy' },
  { id: 'too_much_jargon', label: '📚 Too much jargon', category: 'struggle' },
  { id: 'physical_pain', label: '💪 Physical fatigue', category: 'struggle' },
  { id: 'confusing', label: '🤔 Confusing', category: 'struggle' },
  { id: 'fun', label: '🎉 Enjoyed it!', category: 'positive' },
  { id: 'rushed', label: '⏰ Felt rushed', category: 'struggle' },
  { id: 'boring', label: '😴 Boring/repetitive', category: 'negative' }
];

export default function TaskFeedbackModal({
  isOpen,
  taskTitle,
  estimatedMinutes,
  onSubmit,
  onClose
}: TaskFeedbackModalProps) {
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tookLonger, setTookLonger] = useState(false);
  const [comment, setComment] = useState('');
  const [showCommentBox, setShowCommentBox] = useState(false);

  const handleSubmit = () => {
    if (difficulty === null) return;

    // Haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    onSubmit({
      difficultyRating: difficulty,
      actualDuration: tookLonger ? estimatedMinutes + 10 : estimatedMinutes,
      feedbackTags: selectedTags,
      userComment: comment || undefined
    });

    // Reset state
    setDifficulty(null);
    setSelectedTags([]);
    setTookLonger(false);
    setComment('');
    setShowCommentBox(false);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: tokens.spacing.xl
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: tokens.colors.surface,
            borderRadius: tokens.borderRadius['2xl'],
            padding: tokens.spacing.xl,
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            border: `1px solid ${tokens.colors.border}`,
            position: 'relative'
          }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: tokens.spacing.md,
              right: tokens.spacing.md,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: tokens.spacing.sm,
              borderRadius: tokens.borderRadius.lg,
              color: tokens.colors.text.tertiary,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = tokens.colors.gray[100];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={20} />
          </button>

          {/* Header */}
          <div style={{ marginBottom: tokens.spacing.xl }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: tokens.borderRadius.full,
              backgroundColor: `${tokens.colors.success}20`,
              marginBottom: tokens.spacing.md
            }}>
              <span style={{ fontSize: '24px' }}>✅</span>
            </div>

            <h2 style={{
              fontSize: tokens.typography.sizes.xl,
              fontWeight: tokens.typography.weights.medium,
              color: tokens.colors.text.primary,
              marginBottom: tokens.spacing.sm
            }}>
              Nice work!
            </h2>

            <p style={{
              fontSize: tokens.typography.sizes.sm,
              color: tokens.colors.text.secondary,
              fontWeight: tokens.typography.weights.light
            }}>
              {taskTitle}
            </p>
          </div>

          {/* Difficulty Scale */}
          <div style={{ marginBottom: tokens.spacing.xl }}>
            <label style={{
              display: 'block',
              fontSize: tokens.typography.sizes.base,
              fontWeight: tokens.typography.weights.medium,
              color: tokens.colors.text.primary,
              marginBottom: tokens.spacing.md
            }}>
              How did this feel?
            </label>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: tokens.spacing.sm
            }}>
              {DIFFICULTY_EMOJIS.map(({ value, emoji, label, color }) => (
                <motion.button
                  key={value}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDifficulty(value)}
                  style={{
                    flex: 1,
                    padding: tokens.spacing.md,
                    borderRadius: tokens.borderRadius.xl,
                    border: difficulty === value
                      ? `2px solid ${color}`
                      : `1px solid ${tokens.colors.border}`,
                    backgroundColor: difficulty === value
                      ? `${color}15`
                      : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: tokens.spacing.xs
                  }}
                >
                  <span style={{ fontSize: '28px' }}>{emoji}</span>
                  <span style={{
                    fontSize: tokens.typography.sizes.xs,
                    color: difficulty === value ? color : tokens.colors.text.tertiary,
                    fontWeight: difficulty === value
                      ? tokens.typography.weights.medium
                      : tokens.typography.weights.regular
                  }}>
                    {label}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Time Toggle */}
          <div style={{ marginBottom: tokens.spacing.lg }}>
            <button
              onClick={() => setTookLonger(!tookLonger)}
              style={{
                width: '100%',
                padding: tokens.spacing.md,
                borderRadius: tokens.borderRadius.lg,
                border: tookLonger
                  ? `2px solid ${tokens.colors.primary}`
                  : `1px solid ${tokens.colors.border}`,
                backgroundColor: tookLonger
                  ? `${tokens.colors.primary}10`
                  : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing.sm,
                fontSize: tokens.typography.sizes.sm,
                color: tookLonger ? tokens.colors.primary : tokens.colors.text.secondary,
                transition: 'all 0.2s'
              }}
            >
              <Clock size={16} />
              <span>Took longer than {estimatedMinutes} min</span>
            </button>
          </div>

          {/* Quick Tags */}
          {difficulty !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{ marginBottom: tokens.spacing.lg }}
            >
              <label style={{
                display: 'block',
                fontSize: tokens.typography.sizes.sm,
                color: tokens.colors.text.secondary,
                marginBottom: tokens.spacing.sm
              }}>
                Quick feedback (optional):
              </label>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: tokens.spacing.sm
              }}>
                {QUICK_TAGS.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    style={{
                      padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                      borderRadius: tokens.borderRadius.full,
                      border: selectedTags.includes(tag.id)
                        ? `2px solid ${tokens.colors.primary}`
                        : `1px solid ${tokens.colors.border}`,
                      backgroundColor: selectedTags.includes(tag.id)
                        ? `${tokens.colors.primary}15`
                        : 'transparent',
                      fontSize: tokens.typography.sizes.xs,
                      color: selectedTags.includes(tag.id)
                        ? tokens.colors.primary
                        : tokens.colors.text.tertiary,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Comment Box Toggle */}
          {difficulty !== null && !showCommentBox && (
            <button
              onClick={() => setShowCommentBox(true)}
              style={{
                fontSize: tokens.typography.sizes.sm,
                color: tokens.colors.text.tertiary,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                marginBottom: tokens.spacing.lg,
                textDecoration: 'underline'
              }}
            >
              + Add a note
            </button>
          )}

          {/* Comment Box */}
          {showCommentBox && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{ marginBottom: tokens.spacing.lg }}
            >
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Any additional thoughts?"
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: tokens.spacing.md,
                  borderRadius: tokens.borderRadius.lg,
                  border: `1px solid ${tokens.colors.border}`,
                  backgroundColor: tokens.colors.background,
                  color: tokens.colors.text.primary,
                  fontSize: tokens.typography.sizes.sm,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none'
                }}
              />
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: difficulty !== null ? 1.02 : 1 }}
            whileTap={{ scale: difficulty !== null ? 0.98 : 1 }}
            onClick={handleSubmit}
            disabled={difficulty === null}
            style={{
              width: '100%',
              padding: tokens.spacing.lg,
              borderRadius: tokens.borderRadius.xl,
              border: 'none',
              backgroundColor: difficulty !== null
                ? tokens.colors.primary
                : tokens.colors.gray[300],
              color: 'white',
              fontSize: tokens.typography.sizes.base,
              fontWeight: tokens.typography.weights.medium,
              cursor: difficulty !== null ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: tokens.spacing.sm
            }}
          >
            <Zap size={18} />
            {difficulty !== null ? 'Submit & Continue' : 'Select difficulty first'}
          </motion.button>

          {/* Micro-copy */}
          <p style={{
            marginTop: tokens.spacing.md,
            fontSize: tokens.typography.sizes.xs,
            color: tokens.colors.text.tertiary,
            textAlign: 'center'
          }}>
            This helps us adjust your roadmap every 14 days
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
