import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';
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

const STONE_DESCRIPTIONS: Record<string, string> = {
  TimeConstraint: 'Your schedule genuinely limits how much time you can dedicate',
  ResourceGap: 'Missing equipment, tools, or access you need',
  EnvironmentFriction: 'Your environment makes it harder to practice',
  Inconsistency: 'You start strong but momentum tends to drop off',
  FearOfFailure: 'Fear of doing it wrong or being judged holds you back',
  Perfectionism: 'You delay starting or finishing because it has to be perfect',
  LowConfidence: 'You doubt whether you can actually do this',
  UnrealisticExpectations: "Your expectations don't match typical progress timelines",
  FocusFragility: 'Distractions easily pull you out of focused work',
  CognitiveFatigue: 'Mental fatigue limits how much you can absorb per session',
  SkillGap: 'Missing foundational skills that need to be built first',
  ProcrastinationPattern: 'You have the time but struggle to actually use it',
  Overcommitment: 'You take on more than you can sustain',
};

function getPraiseText(archetype: string, stoneType: string): string {
  const a = archetype.toLowerCase();
  if (a.includes('ambit')) {
    return "You set high standards and take action fast. The key is pairing that drive with a system that keeps momentum even on the hard days.";
  }
  if (a.includes('perfect')) {
    return "Your attention to detail is a real strength. The plan ahead is built to let you ship imperfect reps — because consistency beats perfect, every time.";
  }
  if (a.includes('procrastin') || stoneType === 'ProcrastinationPattern') {
    return "You think carefully before you act — which means your actions tend to be well-considered. The plan uses tiny first steps to bypass the hesitation loop.";
  }
  if (a.includes('overcommit') || stoneType === 'Overcommitment') {
    return "You care enough to say yes to a lot. The plan protects your energy by keeping daily effort small and sustainable, not heroic.";
  }
  if (a.includes('fear') || stoneType === 'FearOfFailure' || stoneType === 'LowConfidence') {
    return "Starting something new takes real courage. The roadmap is built around early wins — so you can build evidence that you can do this, one session at a time.";
  }
  return "You've got the self-awareness most people skip. Knowing your blockers is the first and most important step to actually moving past them.";
}

export default function StoneProfileConfirmation({ stoneProfile, onConfirm, onDoesntFit }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const profile = stoneProfile.stoneProfile;
  const primaryStone = profile.stones.find(s => s.type === profile.primaryStone) ?? profile.stones[0];
  const secondaryStones = profile.stones.filter(s => s.type !== profile.primaryStone).slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px' }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'rgba(124,58,237,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <Sparkles size={16} color="#7c3aed" strokeWidth={1.8} />
        </div>
        <h2 style={{
          fontSize: 20,
          fontWeight: 700,
          color: '#1a1a2e',
          margin: '0 0 6px',
          letterSpacing: '-0.02em',
        }}>
          Here's what we found
        </h2>
        <p style={{ fontSize: 13, color: '#9ca3af', margin: 0, fontWeight: 400 }}>
          {profile.userArchetype}
        </p>
      </div>

      {/* Praise block */}
      {primaryStone && (
        <div style={{
          background: 'rgba(124,58,237,0.04)',
          border: '1px solid rgba(124,58,237,0.1)',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 16,
        }}>
          <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.65 }}>
            {getPraiseText(profile.userArchetype, primaryStone.type)}
          </p>
        </div>
      )}

      {/* Primary stone card */}
      {primaryStone && (
        <div style={{
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 2px 16px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)',
          padding: '20px',
          marginBottom: 10,
        }}>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#7c3aed',
            display: 'block',
            marginBottom: 8,
          }}>
            Primary obstacle
          </span>
          <p style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#1a1a2e',
            margin: '0 0 6px',
            letterSpacing: '-0.01em',
          }}>
            {STONE_LABELS[primaryStone.type] ?? primaryStone.type}
          </p>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.55 }}>
            {STONE_DESCRIPTIONS[primaryStone.type] ?? primaryStone.trigger}
          </p>
        </div>
      )}

      {/* Secondary stones */}
      {secondaryStones.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {secondaryStones.map(stone => (
            <div
              key={stone.type}
              style={{
                background: '#fff',
                borderRadius: 14,
                border: '1px solid #f3f4f6',
                padding: '13px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#d1d5db',
                flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', margin: 0 }}>
                  {STONE_LABELS[stone.type] ?? stone.type}
                </p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>
                  {stone.severity} impact
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* How this shapes your plan — expandable */}
      {profile.agent3Guidance.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              width: '100%',
              background: 'rgba(124,58,237,0.04)',
              border: '1px solid rgba(124,58,237,0.12)',
              borderRadius: 12,
              padding: '12px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              outline: 'none',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: '#7c3aed' }}>
              How this shapes your plan
            </span>
            <ChevronRight
              size={14}
              color="#7c3aed"
              style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            />
          </button>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'rgba(124,58,237,0.03)',
                border: '1px solid rgba(124,58,237,0.08)',
                borderTop: 'none',
                borderRadius: '0 0 12px 12px',
                padding: '12px 16px',
              }}
            >
              <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                {profile.agent3Guidance.map((g, i) => (
                  <li key={i} style={{
                    fontSize: 13,
                    color: '#374151',
                    lineHeight: 1.55,
                    marginBottom: i < profile.agent3Guidance.length - 1 ? 6 : 0,
                  }}>
                    {g}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>
      )}

      {/* CTA buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!showFeedback ? (
          <>
            <button
              onClick={onConfirm}
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <CheckCircle size={16} strokeWidth={2.5} />
              Yes, this sounds like me
            </button>
            <button
              onClick={() => setShowFeedback(true)}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: 14,
                background: 'transparent',
                color: '#9ca3af',
                border: '1.5px solid #f3f4f6',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
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
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 2px' }}>
              What feels off? <span style={{ color: '#9ca3af' }}>(optional)</span>
            </p>
            <textarea
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder="e.g. The fear of failure part doesn't really apply to me..."
              rows={3}
              style={{
                width: '100%',
                borderRadius: 12,
                border: '1.5px solid #e5e7eb',
                padding: '10px 14px',
                fontSize: 13,
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                color: '#1a1a2e',
                lineHeight: 1.6,
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#c4b5fd'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
            />
            <button
              onClick={() => onDoesntFit(feedbackText || undefined)}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: 14,
                background: '#1a1a2e',
                color: '#fff',
                border: 'none',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              Continue anyway
              <ArrowRight size={15} strokeWidth={2} />
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
