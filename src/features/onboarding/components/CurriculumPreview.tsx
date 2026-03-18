/**
 * CurriculumPreview
 *
 * Shows the user their first 7 days before they start.
 * Ends with a pace selector: Too Easy / Just Right / Too Intense.
 * User's choice is passed back to ChatOnboarding which applies
 * the PaceCalibration to all subsequent Agent 4 task generation.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, BookOpen, Dumbbell, Brain, Zap, RotateCcw } from 'lucide-react';
import type { CurriculumPreview as CurriculumPreviewType, PaceChoice } from '@types-app/agents';

interface Props {
  preview: CurriculumPreviewType;
  onPaceSelect: (choice: PaceChoice) => void;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  learning:   { icon: <BookOpen size={13} strokeWidth={2} />,  color: '#2563eb', bg: 'rgba(37,99,235,0.08)',  label: 'Learn' },
  practice:   { icon: <Dumbbell size={13} strokeWidth={2} />,  color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', label: 'Practice' },
  reflection: { icon: <Brain size={13} strokeWidth={2} />,     color: '#059669', bg: 'rgba(5,150,105,0.08)',  label: 'Reflect' },
  challenge:  { icon: <Zap size={13} strokeWidth={2} />,       color: '#dc2626', bg: 'rgba(220,38,38,0.08)',  label: 'Challenge' },
  retrieval:  { icon: <RotateCcw size={13} strokeWidth={2} />, color: '#d97706', bg: 'rgba(217,119,6,0.08)',  label: 'Recall' },
};

const PACE_OPTIONS: { choice: PaceChoice; label: string; sub: string; emoji: string; border: string; bg: string }[] = [
  {
    choice: 'too_easy',
    label: 'Too Easy',
    sub: 'More challenge please',
    emoji: '🚀',
    border: '#a78bfa',
    bg: 'rgba(124,58,237,0.04)',
  },
  {
    choice: 'just_right',
    label: 'Just Right',
    sub: 'This pace works for me',
    emoji: '✓',
    border: '#34d399',
    bg: 'rgba(5,150,105,0.04)',
  },
  {
    choice: 'too_intense',
    label: 'Too Intense',
    sub: 'Dial it back a bit',
    emoji: '😅',
    border: '#fca5a5',
    bg: 'rgba(220,38,38,0.04)',
  },
];

export default function CurriculumPreview({ preview, onPaceSelect }: Props) {
  const [showPacePicker, setShowPacePicker] = useState(false);
  const [selectedPace, setSelectedPace] = useState<PaceChoice | null>(null);

  const handlePaceSelect = (choice: PaceChoice) => {
    setSelectedPace(choice);
    setTimeout(() => onPaceSelect(choice), 400);
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <p style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#7c3aed',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          margin: '0 0 8px',
        }}>
          Your first week
        </p>
        <h2 style={{
          fontSize: 20,
          fontWeight: 700,
          color: '#1a1a2e',
          margin: '0 0 6px',
          letterSpacing: '-0.02em',
        }}>
          {preview.weekTheme}
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
          By Day 7: {preview.endOfWeekOutcome}
        </p>
      </div>

      {/* 7-day task list */}
      <div style={{
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)',
        overflow: 'hidden',
        marginBottom: 20,
      }}>
        {preview.tasks.map((task, idx) => {
          const typeConf = TYPE_CONFIG[task.type] ?? TYPE_CONFIG['practice'];
          const isLast = idx === preview.tasks.length - 1;
          return (
            <motion.div
              key={task.day}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04 }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                padding: '14px 18px',
                borderBottom: isLast ? 'none' : '1px solid #f9fafb',
              }}
            >
              {/* Day number */}
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: idx === 0 ? 'linear-gradient(135deg, #7c3aed, #a78bfa)' : '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 12,
                fontWeight: 700,
                color: idx === 0 ? '#fff' : '#6b7280',
                fontFamily: 'monospace',
              }}>
                {String(task.day).padStart(2, '0')}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  {/* Type pill */}
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    padding: '2px 7px',
                    borderRadius: 99,
                    background: typeConf.bg,
                    color: typeConf.color,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}>
                    {typeConf.icon}
                    {typeConf.label}
                  </span>

                  {/* Duration */}
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: 11,
                    color: '#9ca3af',
                  }}>
                    <Clock size={10} strokeWidth={2} />
                    {task.estimatedMinutes} min
                  </span>
                </div>

                <p style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#1a1a2e',
                  margin: '0 0 2px',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {task.title}
                </p>
                <p style={{
                  fontSize: 12,
                  color: '#9ca3af',
                  margin: 0,
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {task.summary}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Pace picker CTA */}
      <AnimatePresence mode="wait">
        {!showPacePicker ? (
          <motion.div
            key="cta"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p style={{
              textAlign: 'center',
              fontSize: 14,
              fontWeight: 600,
              color: '#374151',
              marginBottom: 14,
            }}>
              How does this pace feel?
            </p>
            <button
              onClick={() => setShowPacePicker(true)}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
                color: '#fff',
                border: 'none',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
              }}
            >
              Rate the difficulty →
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="picker"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <p style={{
              textAlign: 'center',
              fontSize: 14,
              fontWeight: 600,
              color: '#374151',
              marginBottom: 14,
            }}>
              How does this pace feel?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {PACE_OPTIONS.map(opt => {
                const isSelected = selectedPace === opt.choice;
                return (
                  <motion.button
                    key={opt.choice}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handlePaceSelect(opt.choice)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 18px',
                      borderRadius: 14,
                      border: isSelected ? `2px solid ${opt.border}` : '2px solid #f3f4f6',
                      background: isSelected ? opt.bg : '#fafafa',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      outline: 'none',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{opt.emoji}</span>
                    <div>
                      <p style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#1a1a2e',
                        margin: '0 0 2px',
                      }}>
                        {opt.label}
                      </p>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                        {opt.sub}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
