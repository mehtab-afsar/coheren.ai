/**
 * StoneProfileConfirmation
 *
 * Shows the user their detected stone profile after Round 1 + Round 2 diagnostic.
 * Asks "Does this sound like you?" — user can confirm or flag that something
 * doesn't fit (which triggers a partial retry with adjusted weighting).
 *
 * Rendered between StoneQuestions Round 2 and curriculum generation.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';
import type { Agent2ProfileOutput, StoneSeverity } from '@types-app/agents';

interface Props {
  stoneProfile: Agent2ProfileOutput;
  onConfirm: () => void;
  onDoesntFit: () => void;
}

const SEVERITY_COLORS: Record<StoneSeverity, { bg: string; text: string; border: string }> = {
  Critical: { bg: 'rgba(239,68,68,0.08)', text: '#dc2626', border: '#fca5a5' },
  High:     { bg: 'rgba(245,158,11,0.08)', text: '#d97706', border: '#fcd34d' },
  Moderate: { bg: 'rgba(124,58,237,0.07)', text: '#7c3aed', border: '#c4b5fd' },
  Low:      { bg: 'rgba(16,185,129,0.07)', text: '#059669', border: '#6ee7b7' },
};

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
  UnrealisticExpectations: 'Your expectations don\'t match typical progress timelines',
  FocusFragility: 'Distractions easily pull you out of focused work',
  CognitiveFatigue: 'Mental fatigue limits how much you can absorb per session',
  SkillGap: 'Missing foundational skills that need to be built first',
  ProcrastinationPattern: 'You have the time but struggle to actually use it',
  Overcommitment: 'You take on more than you can sustain',
};

export default function StoneProfileConfirmation({ stoneProfile, onConfirm, onDoesntFit }: Props) {
  const [expanded, setExpanded] = useState(false);
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
          width: 52,
          height: 52,
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(167,139,250,0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px',
          fontSize: 24,
        }}>
          🧠
        </div>
        <h2 style={{
          fontSize: 20,
          fontWeight: 700,
          color: '#1a1a2e',
          margin: '0 0 6px',
          letterSpacing: '-0.02em',
        }}>
          Your profile
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
          Based on your answers, here's what we found
        </p>
      </div>

      {/* Archetype pill */}
      <div style={{
        textAlign: 'center',
        marginBottom: 20,
      }}>
        <span style={{
          display: 'inline-block',
          padding: '6px 16px',
          borderRadius: 99,
          background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.01em',
        }}>
          {profile.userArchetype}
        </span>
      </div>

      {/* Primary stone card */}
      {primaryStone && (
        <div style={{
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
          padding: '20px',
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#7c3aed',
            }}>
              Primary obstacle
            </span>
            <div style={{
              ...SEVERITY_COLORS[primaryStone.severity],
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '2px 8px',
              borderRadius: 99,
              border: `1px solid ${SEVERITY_COLORS[primaryStone.severity].border}`,
            }}>
              {primaryStone.severity}
            </div>
          </div>
          <p style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#1a1a2e',
            margin: '0 0 6px',
            letterSpacing: '-0.01em',
          }}>
            {STONE_LABELS[primaryStone.type] ?? primaryStone.type}
          </p>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
            {STONE_DESCRIPTIONS[primaryStone.type] ?? primaryStone.trigger}
          </p>
        </div>
      )}

      {/* Secondary stones */}
      {secondaryStones.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {secondaryStones.map(stone => {
            const colors = SEVERITY_COLORS[stone.severity];
            return (
              <div
                key={stone.type}
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  border: '1px solid #f3f4f6',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: colors.text,
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', margin: 0 }}>
                    {STONE_LABELS[stone.type] ?? stone.type}
                  </p>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>
                    {stone.severity} impact
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* What this means — expandable */}
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
              style={{
                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
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
          onClick={onDoesntFit}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: 14,
            background: 'transparent',
            color: '#6b7280',
            border: '1.5px solid #e5e7eb',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={15} strokeWidth={2} />
          Some parts don't fit
        </button>
      </div>
    </motion.div>
  );
}
