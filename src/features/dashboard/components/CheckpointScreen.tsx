import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { tokens } from '@core/design-system';
import { useBreakpoint } from '@hooks/useBreakpoint';

interface CheckpointScreenProps {
  checkpointDay: number;
  sprintNumber: number;
  completedTasks: number;
  totalTasks: number;
  avgDifficulty: number;
  strugglingAreas?: string[];
  masteringAreas?: string[];
  onComplete: (feedback: CheckpointFeedback) => void;
  isRecalibrating?: boolean;
  recalibrationResult?: {
    coachMessage: string;
    nextSprintFocus: string;
    stoneDirective?: string;
  } | null;
}

export interface CheckpointFeedback {
  overallConfidence: number; // 1-10
  energyLevel: 'exhausted' | 'tired' | 'good' | 'energized';
  timeManagement: 'no_time' | 'rushed' | 'comfortable' | 'extra_time';
  qualitativeFeedback: string;
  specificStruggles?: string;
}

const TIME_OPTIONS: { value: CheckpointFeedback['timeManagement']; label: string }[] = [
  { value: 'no_time',     label: 'Not enough' },
  { value: 'rushed',      label: 'Tight' },
  { value: 'comfortable', label: 'Fine' },
  { value: 'extra_time',  label: 'Plenty' },
];

export default function CheckpointScreen({
  checkpointDay: _checkpointDay,
  sprintNumber,
  completedTasks,
  totalTasks,
  avgDifficulty,
  strugglingAreas = [],
  masteringAreas = [],
  onComplete,
  isRecalibrating = false,
  recalibrationResult = null,
}: CheckpointScreenProps) {
  const { isMobile } = useBreakpoint();
  const [confidence, setConfidence] = useState(5);
  const [timeManagement, setTimeManagement] = useState<CheckpointFeedback['timeManagement']>('comfortable');
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const completionRate = Math.round((completedTasks / totalTasks) * 100);
  const weekStart = (sprintNumber - 1) * 14 + 1;
  const weekEnd = weekStart + 13;

  const performanceLabel = avgDifficulty > 3.5 ? 'Challenging' : avgDifficulty < 2.5 ? 'Too easy' : 'Well balanced';

  const statBullets = [
    `${completedTasks} of ${totalTasks} tasks completed (${completionRate}%)`,
    masteringAreas.length > 0
      ? `Strongest area: ${masteringAreas[0]}`
      : `Difficulty average: ${avgDifficulty.toFixed(1)}/5 — ${performanceLabel.toLowerCase()}`,
    strugglingAreas.length > 0
      ? `Needs more practice: ${strugglingAreas[0]}`
      : 'No major struggle areas identified',
    `Sprint ${sprintNumber} difficulty: ${performanceLabel}`,
  ];

  const handleSubmit = () => {
    setSubmitted(true);
    onComplete({
      overallConfidence: confidence,
      energyLevel: 'good',
      timeManagement,
      qualitativeFeedback: feedback,
    });
  };

  return (
    <motion.div
      data-testid="checkpoint-screen"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 40 }}
    >
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px',
          background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
          borderRadius: 99, marginBottom: 12,
        }}>
          <Sparkles size={12} color="#fff" strokeWidth={2} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', letterSpacing: '0.04em' }}>
            Sprint {sprintNumber} Complete
          </span>
        </div>
        <h1 style={{
          fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 700,
          color: tokens.colors.text.primary, letterSpacing: '-0.03em',
          margin: '0 0 6px', lineHeight: 1.15,
        }}>
          Days {weekStart}–{weekEnd} done.
        </h1>
        <p style={{ fontSize: 14, color: tokens.colors.text.secondary, margin: 0, lineHeight: 1.5 }}>
          Here's what happened, and what's next.
        </p>
      </div>

      {/* Stats: Here's what happened */}
      <div style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: 16, padding: '18px 20px', marginBottom: 20,
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: tokens.colors.text.tertiary, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 12px' }}>
          Here's what happened
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {statBullets.map((bullet, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ color: '#7c3aed', fontSize: 14, lineHeight: 1.5, flexShrink: 0 }}>·</span>
              <span style={{ fontSize: 14, color: tokens.colors.text.secondary, lineHeight: 1.5 }}>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* What I'm changing (AI message) */}
      {recalibrationResult ? (
        <div style={{
          background: '#f5f3ff', border: '1px solid rgba(124,58,237,0.15)',
          borderRadius: 16, padding: '18px 20px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <Sparkles size={13} color="#7c3aed" strokeWidth={2} />
            <p style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', letterSpacing: '0.07em', textTransform: 'uppercase', margin: 0 }}>
              What I'm changing
            </p>
          </div>
          <p style={{ fontSize: 14, color: tokens.colors.text.primary, lineHeight: 1.65, margin: 0 }}>
            {recalibrationResult.coachMessage}
          </p>
          {recalibrationResult.nextSprintFocus && (
            <p style={{ fontSize: 12, color: tokens.colors.text.tertiary, margin: '10px 0 0' }}>
              Sprint {sprintNumber + 1} focus: {recalibrationResult.nextSprintFocus}
            </p>
          )}
        </div>
      ) : !submitted ? (
        <div style={{
          background: '#f5f3ff', border: '1px solid rgba(124,58,237,0.12)',
          borderRadius: 16, padding: '16px 20px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <Sparkles size={13} color="#7c3aed" strokeWidth={2} />
            <p style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', letterSpacing: '0.07em', textTransform: 'uppercase', margin: 0 }}>
              What I'm changing
            </p>
          </div>
          <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6, margin: 0 }}>
            I'll adjust your next sprint based on your check-in below.
          </p>
        </div>
      ) : null}

      {/* Quick check-in */}
      {!recalibrationResult && (
        <div style={{
          background: tokens.colors.surface, border: `1px solid ${tokens.colors.border}`,
          borderRadius: 16, padding: '18px 20px', marginBottom: 24,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: tokens.colors.text.tertiary, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 18px' }}>
            Quick check-in
          </p>

          {/* Confidence slider */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 13, color: tokens.colors.text.primary, fontWeight: 500 }}>
                Confidence with skills learned
              </label>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#7c3aed', minWidth: 36, textAlign: 'right' }}>
                {confidence}/10
              </span>
            </div>
            <input
              data-testid="checkpoint-confidence"
              type="range" min="1" max="10" value={confidence}
              onChange={e => setConfidence(parseInt(e.target.value))}
              style={{ width: '100%', height: 6, borderRadius: 99, cursor: 'pointer',
                background: `linear-gradient(to right, #7c3aed ${(confidence - 1) / 9 * 100}%, #e5e7eb ${(confidence - 1) / 9 * 100}%)`,
                outline: 'none', appearance: 'none' as const }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 11, color: tokens.colors.text.tertiary }}>Still learning</span>
              <span style={{ fontSize: 11, color: tokens.colors.text.tertiary }}>Fully mastered</span>
            </div>
          </div>

          {/* Time buttons */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, color: tokens.colors.text.primary, fontWeight: 500, marginBottom: 10 }}>
              How was the time commitment?
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 8 }}>
              {TIME_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  data-testid="checkpoint-time"
                  data-value={value}
                  onClick={() => setTimeManagement(value)}
                  style={{
                    padding: '9px 4px', borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    border: timeManagement === value ? '2px solid #7c3aed' : `1px solid ${tokens.colors.border}`,
                    backgroundColor: timeManagement === value ? 'rgba(124,58,237,0.08)' : 'transparent',
                    color: timeManagement === value ? '#7c3aed' : tokens.colors.text.secondary,
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional note */}
          <div>
            <label style={{ display: 'block', fontSize: 13, color: tokens.colors.text.primary, fontWeight: 500, marginBottom: 8 }}>
              Anything for your AI to know? (optional)
            </label>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="e.g., I want more practice tasks, less theory..."
              rows={2}
              style={{
                width: '100%', padding: '10px 12px',
                border: `1px solid ${tokens.colors.border}`, borderRadius: 10,
                fontSize: 13, color: tokens.colors.text.primary,
                fontFamily: 'inherit', resize: 'none', outline: 'none',
                backgroundColor: tokens.colors.background, boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        data-testid="checkpoint-submit"
        onClick={recalibrationResult ? handleSubmit : handleSubmit}
        disabled={isRecalibrating}
        style={{
          width: '100%', padding: '15px',
          borderRadius: 14, border: 'none',
          background: isRecalibrating ? '#e5e7eb' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
          color: isRecalibrating ? '#9ca3af' : '#fff',
          fontSize: 15, fontWeight: 600,
          cursor: isRecalibrating ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          letterSpacing: '-0.01em', transition: 'all 0.15s',
          boxShadow: isRecalibrating ? 'none' : '0 4px 20px rgba(124,58,237,0.3)',
        }}
      >
        {isRecalibrating ? (
          <>
            <div style={{ width: 16, height: 16, border: '2px solid #9ca3af', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            Adjusting your roadmap...
          </>
        ) : recalibrationResult ? (
          <>Continue to Sprint {sprintNumber + 1} <ArrowRight size={16} /></>
        ) : (
          <>Continue <ArrowRight size={16} /></>
        )}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}
