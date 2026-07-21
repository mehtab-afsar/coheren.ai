import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tokens } from '@core/design-system';
import { useStore } from '@core/store/useStore';

interface TaskFeedbackModalProps {
  isOpen: boolean;
  taskTitle: string;
  /** Real measured minutes from the focus timer, or undefined when no session was timed. */
  actualMinutes?: number;
  onSubmit: (feedback: TaskFeedback) => void;
  onClose: () => void;
}

export interface TaskFeedback {
  difficultyRating: number; // 1-5
  actualDuration?: number;
  feedbackTags: string[];
  userComment?: string;
}

// Mood → difficulty mapping (😫=5 hard, 🤩=1 easy)
const MOODS = [
  { emoji: '😫', value: 5 },
  { emoji: '😕', value: 4 },
  { emoji: '😐', value: 3 },
  { emoji: '🙂', value: 2 },
  { emoji: '🤩', value: 1 },
];

export default function TaskFeedbackModal({
  isOpen,
  taskTitle,
  actualMinutes,
  onSubmit,
  onClose,
}: TaskFeedbackModalProps) {
  const streak = useStore(s => s.streak);
  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    if (mood === null) return;
    if (navigator.vibrate) navigator.vibrate(50);
    onSubmit({
      difficultyRating: mood,
      // Only report a real measured duration; undefined when nothing was timed
      // (previously this hardcoded the ESTIMATE, poisoning every time-based signal).
      actualDuration: actualMinutes,
      feedbackTags: [],
      userComment: note.trim() || undefined,
    });
    setMood(null);
    setNote('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          backgroundColor: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: 0,
        }}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 480,
            backgroundColor: tokens.colors.surface,
            borderRadius: '24px 24px 0 0',
            padding: '28px 24px',
            paddingBottom: 'calc(28px + env(safe-area-inset-bottom))',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
          }}
        >
          {/* Drag handle */}
          <div style={{ width: 36, height: 4, borderRadius: 99, background: '#e5e7eb', margin: '0 auto 24px' }} />

          {/* Header */}
          <p style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: '0 0 4px', letterSpacing: '-0.025em' }}>
            How did that feel?
          </p>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 24px', lineHeight: 1.4 }}>
            {taskTitle}
          </p>

          {/* Mood row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
            {MOODS.map(({ emoji, value }) => (
              <button
                key={value}
                data-testid="mood-option"
                data-mood={value}
                aria-label={`Difficulty ${value}`}
                onClick={() => setMood(value)}
                style={{
                  flex: 1, padding: '10px 4px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  background: mood === value ? 'rgba(196, 85, 45,0.08)' : 'transparent',
                  border: `2px solid ${mood === value ? '#C4552D' : 'transparent'}`,
                  borderRadius: 14, cursor: 'pointer',
                  transition: 'all 150ms ease',
                  margin: '0 3px',
                }}
              >
                <span style={{ fontSize: 28 }}>{emoji}</span>
              </button>
            ))}
          </div>

          {/* Optional note */}
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 8px' }}>Anything to note? (optional)</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Quick thought..."
            rows={2}
            style={{
              width: '100%', padding: '10px 12px',
              border: '1px solid #e5e7eb', borderRadius: 12,
              fontSize: 14, color: '#374151',
              fontFamily: 'inherit', resize: 'none',
              outline: 'none', backgroundColor: '#fafafa',
              marginBottom: 20,
              boxSizing: 'border-box',
            }}
          />

          {/* Done button */}
          <button
            data-testid="feedback-submit"
            onClick={handleSubmit}
            disabled={mood === null}
            style={{
              width: '100%', padding: '14px',
              borderRadius: 14, border: 'none',
              background: mood !== null ? 'linear-gradient(135deg, #C4552D 0%, #A8451F 100%)' : '#e5e7eb',
              color: mood !== null ? '#fff' : '#9ca3af',
              fontSize: 15, fontWeight: 600,
              cursor: mood !== null ? 'pointer' : 'not-allowed',
              transition: 'all 150ms ease',
              letterSpacing: '-0.01em',
            }}
          >
            Done
          </button>

          {/* Streak footer */}
          {streak > 0 && (
            <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', margin: '14px 0 0' }}>
              {streak}-day streak 🔥
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
