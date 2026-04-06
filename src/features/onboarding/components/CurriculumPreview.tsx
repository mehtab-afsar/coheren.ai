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
import type { CurriculumPreview as CurriculumPreviewType, PaceChoice } from '@types-app/agents';

interface Props {
  preview: CurriculumPreviewType;
  onPaceSelect: (choice: PaceChoice, feedback?: string) => void;
  revisedChoice?: PaceChoice | null;
  stoneNames?: string[];
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PACE_OPTIONS: { choice: PaceChoice; label: string; sub: string }[] = [
  { choice: 'too_easy',    label: 'Too Easy',    sub: 'More challenge' },
  { choice: 'just_right',  label: 'Just Right',  sub: 'This pace works' },
  { choice: 'too_intense', label: 'Too Intense', sub: 'Dial back a bit' },
];

export default function CurriculumPreview({ preview, onPaceSelect, revisedChoice, stoneNames }: Props) {
  const [selectedPace, setSelectedPace] = useState<PaceChoice | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  const handlePaceSelect = (choice: PaceChoice) => {
    setSelectedPace(choice);
    setTimeout(() => onPaceSelect(choice, feedbackText || undefined), 300);
  };

  const REVISED_LABEL: Record<string, string> = {
    too_intense: 'Dialled back',
    too_easy: 'Stepped up',
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 24px' }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ marginBottom: 32 }}
      >
        <h1 style={{
          fontFamily: 'var(--c-font-display)',
          fontSize: 'clamp(28px, 6vw, 40px)',
          fontWeight: 500,
          color: 'var(--c-text-primary)',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          margin: '0 0 10px',
        }}>
          Your 90-day plan
          <br />is ready.
        </h1>
        {stoneNames && stoneNames.length > 0 && (
          <p style={{
            fontSize: 15,
            color: 'var(--c-text-tertiary)',
            margin: '0 0 4px',
            lineHeight: 1.5,
            fontFamily: 'var(--c-font-body)',
          }}>
            Adapted for {stoneNames.join(' and ')}.
          </p>
        )}
        <p style={{
          fontSize: 13,
          color: 'var(--c-text-quaternary)',
          margin: 0,
          fontFamily: 'var(--c-font-body)',
        }}>
          Week 1 · {preview.weekTheme}
        </p>
      </motion.div>

      {/* 7-day task list */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid var(--c-border-subtle)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: 'var(--c-shadow-card)',
          marginBottom: 28,
        }}
      >
        {preview.tasks.map((task, idx) => {
          const isLast = idx === preview.tasks.length - 1;
          const dayName = DAY_NAMES[idx] ?? `Day ${task.day}`;
          const isRest = (task.type as string) === 'rest' || task.title?.toLowerCase().includes('rest');
          return (
            <div
              key={task.day}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 16px',
                borderBottom: isLast ? 'none' : '1px solid var(--c-border-subtle)',
              }}
            >
              {/* Day dot */}
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: idx === 0 ? 'var(--c-accent-purple)' : 'var(--c-border-medium)',
                flexShrink: 0,
              }} />

              {/* Day name */}
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--c-text-quaternary)',
                width: 28,
                flexShrink: 0,
                fontFamily: 'var(--c-font-body)',
              }}>
                {dayName}
              </span>

              {/* Task title */}
              <span style={{
                fontSize: 13,
                color: isRest ? 'var(--c-text-quaternary)' : 'var(--c-text-primary)',
                fontFamily: 'var(--c-font-body)',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontStyle: isRest ? 'italic' : 'normal',
              }}>
                {isRest ? 'Rest' : task.title}
              </span>

              {/* Duration */}
              {!isRest && task.estimatedMinutes && (
                <span style={{
                  fontSize: 11,
                  color: 'var(--c-text-quaternary)',
                  flexShrink: 0,
                  fontFamily: 'var(--c-font-body)',
                }}>
                  {task.estimatedMinutes}m
                </span>
              )}
            </div>
          );
        })}
      </motion.div>

      {/* Locked phase 2+ teaser */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={{
          padding: '10px 14px',
          backgroundColor: 'var(--c-surface-elevated)',
          border: '1px solid var(--c-border-subtle)',
          borderRadius: 10,
          marginBottom: 28,
        }}
      >
        <span style={{
          fontSize: 12,
          color: 'var(--c-text-quaternary)',
          fontStyle: 'italic',
          fontFamily: 'var(--c-font-body)',
        }}>
          Phase 2 & 3 unlock after Phase 1 completes — designed around your progress.
        </span>
      </motion.div>

      {/* Pace selector + CTA */}
      <AnimatePresence mode="wait">
        {revisedChoice ? (
          <motion.div
            key="revised"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <p style={{
              fontSize: 13, color: 'var(--c-text-tertiary)', margin: '0 0 4px',
              fontFamily: 'var(--c-font-body)',
            }}>
              <span style={{
                color: 'var(--c-accent-purple)',
                fontWeight: 600,
              }}>{REVISED_LABEL[revisedChoice] ?? 'Revised'}</span> — does this feel right?
            </p>
            <button
              onClick={() => onPaceSelect(revisedChoice, feedbackText || undefined)}
              style={{
                width: '100%', padding: '15px',
                borderRadius: 12, background: 'var(--c-accent-purple)',
                color: '#fff', border: 'none', fontSize: 15, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--c-font-body)',
                letterSpacing: '-0.01em',
              }}
            >
              Start Day 1 →
            </button>
            <button
              onClick={() => onPaceSelect('just_right')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: 'var(--c-text-quaternary)', padding: '8px 0',
                fontFamily: 'var(--c-font-body)',
              }}
            >
              Original pace was fine
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="pace"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* Pace label */}
            <p style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--c-text-secondary)',
              margin: '0 0 12px',
              fontFamily: 'var(--c-font-body)',
            }}>
              How does this pace feel?
            </p>

            {/* 3-pill inline selector */}
            <div style={{
              display: 'flex',
              gap: 8,
              marginBottom: 24,
            }}>
              {PACE_OPTIONS.map(opt => {
                const isSelected = selectedPace === opt.choice;
                const isJustRight = opt.choice === 'just_right';
                return (
                  <button
                    key={opt.choice}
                    onClick={() => setSelectedPace(opt.choice)}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      borderRadius: 10,
                      border: isSelected
                        ? `2px solid var(--c-accent-purple)`
                        : '1.5px solid var(--c-border-subtle)',
                      background: isSelected
                        ? 'var(--c-accent-purple-soft)'
                        : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      outline: 'none',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: isSelected ? 'var(--c-accent-purple)' : 'var(--c-text-primary)',
                      fontFamily: 'var(--c-font-body)',
                      marginBottom: 2,
                    }}>
                      {opt.label}
                    </div>
                    <div style={{
                      fontSize: 10,
                      color: 'var(--c-text-quaternary)',
                      fontFamily: 'var(--c-font-body)',
                    }}>
                      {opt.sub}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Single CTA */}
            <button
              onClick={() => selectedPace ? handlePaceSelect(selectedPace) : handlePaceSelect('just_right')}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: 12,
                background: 'var(--c-accent-purple)',
                color: '#fff',
                border: 'none',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--c-font-body)',
                letterSpacing: '-0.01em',
              }}
            >
              Start Day 1 →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
