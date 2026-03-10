import { Wrench } from 'lucide-react';
import { tokens } from '@core/design-system';

interface Props {
  onSimplify: () => void;
  onExtend: () => void;
  onKeep: () => void;
}

export default function DifficultyPrompt({ onSimplify, onExtend, onKeep }: Props) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '24px',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        backgroundColor: tokens.colors.surface,
        border: `1px solid ${tokens.colors.borderLight}`,
        borderRadius: tokens.borderRadius.xl,
        padding: tokens.spacing['2xl'],
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
      }}>
        {/* Icon + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.md, marginBottom: tokens.spacing.lg }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: tokens.borderRadius.md,
            backgroundColor: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Wrench size={20} color="#f59e0b" />
          </div>
          <h2 style={{
            fontSize: tokens.typography.sizes.lg,
            fontWeight: tokens.typography.weights.semibold,
            color: tokens.colors.text.primary,
            margin: 0,
            letterSpacing: '-0.02em',
          }}>
            Let's adjust your plan
          </h2>
        </div>

        <p style={{
          fontSize: tokens.typography.sizes.sm,
          color: tokens.colors.text.secondary,
          marginBottom: tokens.spacing.xl,
          lineHeight: 1.6,
        }}>
          You've been finding things tough lately. It's okay — let's make this sustainable.
        </p>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.sm }}>
          <button
            onClick={onSimplify}
            style={{
              padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
              backgroundColor: '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: tokens.borderRadius.md,
              cursor: 'pointer',
              fontSize: tokens.typography.sizes.sm,
              fontWeight: tokens.typography.weights.medium,
              textAlign: 'left' as const,
              lineHeight: 1.4,
            }}
          >
            Simplify this week — fewer, shorter tasks
          </button>
          <button
            onClick={onExtend}
            style={{
              padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
              backgroundColor: 'transparent',
              color: tokens.colors.text.primary,
              border: `1px solid ${tokens.colors.borderLight}`,
              borderRadius: tokens.borderRadius.md,
              cursor: 'pointer',
              fontSize: tokens.typography.sizes.sm,
              fontWeight: tokens.typography.weights.medium,
              textAlign: 'left' as const,
              lineHeight: 1.4,
            }}
          >
            Extend my timeline — add 1–2 more weeks
          </button>
          <button
            onClick={onKeep}
            style={{
              padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
              backgroundColor: 'transparent',
              color: tokens.colors.text.tertiary,
              border: 'none',
              borderRadius: tokens.borderRadius.md,
              cursor: 'pointer',
              fontSize: tokens.typography.sizes.sm,
              textAlign: 'left' as const,
              lineHeight: 1.4,
            }}
          >
            I'm fine — keep going as planned
          </button>
        </div>
      </div>
    </div>
  );
}
