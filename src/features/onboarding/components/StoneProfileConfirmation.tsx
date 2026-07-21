import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { Agent2ProfileOutput } from '@types-app/agents';

interface Props {
  stoneProfile: Agent2ProfileOutput;
  onConfirm: () => void;
  onDoesntFit: (feedback?: string) => void;
}

const STONE_LABELS: Record<string, string> = {
  TimeConstraint: 'Time Constraint',
  ResourceGap: 'Resource Gap',
  EnvironmentFriction: 'Environment Friction',
  Inconsistency: 'Inconsistency',
  FearOfFailure: 'Fear of Failure',
  Perfectionism: 'Perfectionism',
  LowConfidence: 'Low Confidence',
  UnrealisticExpectations: 'Unrealistic Expectations',
  FocusFragility: 'Focus Fragility',
  CognitiveFatigue: 'Cognitive Fatigue',
  SkillGap: 'Skill Gap',
  ProcrastinationPattern: 'Procrastination Pattern',
  Overcommitment: 'Overcommitment',
};

function getPraiseText(archetype: string, stoneType: string): string {
  switch (stoneType) {
    case 'SkillGap':
      return "Everyone starts somewhere. The plan is structured to build missing foundations first — so each session adds to a base that actually holds.";
    case 'TimeConstraint':
      return "Working with limited time is a real constraint, not an excuse. The sessions ahead are designed to fit your actual schedule, not an ideal one.";
    case 'LowConfidence':
    case 'FearOfFailure':
      return "Starting something new takes real courage. The roadmap is built around early wins — so you can build evidence that you can do this, one session at a time.";
    case 'Perfectionism':
      return "Your attention to detail is a real strength. The plan ahead is built to let you ship imperfect reps — because consistency beats perfect, every time.";
    case 'ProcrastinationPattern':
      return "You think carefully before you act — which means your actions tend to be well-considered. The plan uses tiny first steps to bypass the hesitation loop.";
    case 'Overcommitment':
      return "You care enough to say yes to a lot. The plan protects your energy by keeping daily effort small and sustainable, not heroic.";
    case 'Inconsistency':
      return "Momentum is a skill, not a personality trait. The structure ahead is designed to make showing up the path of least resistance.";
    case 'FocusFragility':
      return "Deep focus is trainable. Sessions are kept short and single-threaded so distraction has fewer opportunities to win.";
    case 'CognitiveFatigue':
      return "Your brain has limits — and working with them beats fighting them. Sessions are spaced to keep load manageable and retention high.";
    case 'EnvironmentFriction':
      return "Your environment is working against you right now. The plan includes friction-reduction steps so the context supports the habit.";
    case 'ResourceGap':
      return "The plan works with what you have. Each session is scoped to your current access — and scales as your resources do.";
    case 'UnrealisticExpectations':
      return "Real progress is slower and more durable than most people expect. The timeline ahead is calibrated to actual research, not hype.";
  }

  const a = archetype.toLowerCase();
  if (a.includes('perfect')) {
    return "Your attention to detail is a real strength. The plan ahead is built to let you ship imperfect reps — because consistency beats perfect, every time.";
  }
  if (a.includes('ambit')) {
    return "You set high standards and take action fast. The key is pairing that drive with a system that keeps momentum even on the hard days.";
  }
  return "You've got the self-awareness most people skip. Knowing your blockers is the first and most important step to actually moving past them.";
}

const SEVERITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Low:      { bg: 'rgba(34,197,94,0.06)',   border: 'rgba(34,197,94,0.20)',   text: '#16a34a' },
  Moderate: { bg: 'rgba(245,158,11,0.06)',  border: 'rgba(245,158,11,0.20)',  text: '#d97706' },
  High:     { bg: 'rgba(239,68,68,0.06)',   border: 'rgba(239,68,68,0.20)',   text: '#dc2626' },
  Critical: { bg: 'rgba(196, 85, 45,0.06)',  border: 'rgba(196, 85, 45,0.20)', text: '#C4552D' },
};

export default function StoneProfileConfirmation({ stoneProfile, onConfirm, onDoesntFit }: Props) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const profile = stoneProfile.stoneProfile;
  const primaryStone = profile.stones.find(s => s.type === profile.primaryStone) ?? profile.stones[0];
  const secondaryStones = profile.stones.filter(s => s.type !== profile.primaryStone).slice(0, 2);

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
          margin: '0 0 12px',
        }}>
          Here's what we learned
          <br />about you.
        </h1>
        <p style={{
          fontSize: 16,
          color: 'var(--c-text-tertiary)',
          margin: 0,
          lineHeight: 1.5,
          fontFamily: 'var(--c-font-body)',
        }}>
          We identified {profile.stones.length} pattern{profile.stones.length !== 1 ? 's' : ''} that could
          affect your progress.
        </p>
        {profile.userArchetype && (
          <span style={{
            display: 'inline-block',
            marginTop: 12,
            padding: '4px 12px',
            borderRadius: 9999,
            background: 'rgba(206, 107, 69,0.10)',
            border: '1px solid rgba(206, 107, 69,0.20)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--c-accent-purple)',
            fontFamily: 'var(--c-font-body)',
            letterSpacing: '0.01em',
          }}>
            {profile.userArchetype}
          </span>
        )}
      </motion.div>

      {/* Primary stone */}
      {primaryStone && (() => {
        const sev = primaryStone.severity ?? 'Moderate';
        const colors = SEVERITY_COLORS[sev] ?? SEVERITY_COLORS.Moderate;
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ marginBottom: 10 }}
          >
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--c-text-quaternary)',
              marginBottom: 8, fontFamily: 'var(--c-font-body)',
            }}>
              Primary
            </div>
            <div style={{
              padding: '20px',
              backgroundColor: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{
                  fontSize: 15, fontWeight: 600,
                  color: 'var(--c-text-primary)',
                  fontFamily: 'var(--c-font-body)',
                }}>
                  {STONE_LABELS[primaryStone.type] ?? primaryStone.type}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: colors.text,
                  backgroundColor: colors.border,
                  padding: '2px 7px',
                  borderRadius: 9999,
                  fontFamily: 'var(--c-font-body)',
                }}>
                  {sev}
                </span>
                {primaryStone.category && (
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: 'var(--c-text-quaternary)',
                    background: 'var(--c-surface-raised)',
                    padding: '2px 7px',
                    borderRadius: 9999,
                    fontFamily: 'var(--c-font-body)',
                  }}>
                    {primaryStone.category}
                  </span>
                )}
              </div>
              {primaryStone.trigger && (
                <p style={{
                  fontSize: 14,
                  color: 'var(--c-text-secondary)',
                  margin: '0 0 10px',
                  lineHeight: 1.6,
                  fontFamily: 'var(--c-font-body)',
                }}>
                  {primaryStone.trigger}
                </p>
              )}
              <p style={{
                fontFamily: 'var(--c-font-display)',
                fontStyle: 'italic',
                fontSize: 13,
                color: 'var(--c-text-tertiary)',
                margin: 0,
                lineHeight: 1.6,
              }}>
                "{getPraiseText(profile.userArchetype, primaryStone.type)}"
              </p>
            </div>
          </motion.div>
        );
      })()}

      {/* Secondary stones */}
      {secondaryStones.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
          {secondaryStones.map((stone, i) => {
            const sev = stone.severity ?? 'Low';
            const colors = SEVERITY_COLORS[sev] ?? SEVERITY_COLORS.Low;
            return (
              <motion.div
                key={stone.type}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.2 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <div style={{
                  padding: '14px 16px',
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  <div style={{ flex: 1 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      color: 'var(--c-text-primary)',
                      fontFamily: 'var(--c-font-body)',
                    }}>
                      {STONE_LABELS[stone.type] ?? stone.type}
                    </span>
                    {stone.category && (
                      <span style={{ fontSize: 11, color: 'var(--c-text-quaternary)', fontFamily: 'var(--c-font-body)' }}>
                        {' · '}{stone.category}
                      </span>
                    )}
                    {' '}
                    <span style={{
                      fontSize: 12,
                      color: 'var(--c-text-tertiary)',
                      fontFamily: 'var(--c-font-body)',
                    }}>
                      — {stone.trigger}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: colors.text,
                    backgroundColor: colors.border,
                    padding: '2px 7px',
                    borderRadius: 9999,
                    flexShrink: 0,
                    fontFamily: 'var(--c-font-body)',
                  }}>
                    {sev}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {!showFeedback ? (
          <>
            <button
              onClick={onConfirm}
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
              Build my plan →
            </button>
            <button
              onClick={() => setShowFeedback(true)}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: 12,
                background: 'transparent',
                color: 'var(--c-text-quaternary)',
                border: '1px solid var(--c-border-subtle)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'var(--c-font-body)',
              }}
            >
              Some parts don't fit
            </button>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <p style={{
              fontSize: 13, color: 'var(--c-text-tertiary)',
              margin: '0 0 2px', fontFamily: 'var(--c-font-body)',
            }}>
              What feels off? <span style={{ color: 'var(--c-text-quaternary)' }}>(optional)</span>
            </p>
            <textarea
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder="e.g. The fear of failure part doesn't really apply to me..."
              rows={3}
              style={{
                width: '100%',
                border: 'none',
                borderBottom: '1.5px solid var(--c-border-subtle)',
                padding: '0 0 10px',
                fontSize: 14,
                resize: 'none',
                outline: 'none',
                fontFamily: 'var(--c-font-body)',
                color: 'var(--c-text-primary)',
                lineHeight: 1.6,
                background: 'transparent',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.currentTarget.style.borderBottomColor = 'var(--c-accent-purple)'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = 'var(--c-border-subtle)'; }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={() => onDoesntFit(feedbackText || undefined)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--c-accent-purple)',
                  fontFamily: 'var(--c-font-body)',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Continue anyway
                <ArrowRight size={15} strokeWidth={2} />
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
