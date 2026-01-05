import { ChevronLeft } from 'lucide-react';
import { tokens, button } from '../../design-system';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  variant?: 'inline' | 'header';
}

export function BackButton({ onClick, label = 'Back', variant = 'inline' }: BackButtonProps) {
  if (variant === 'header') {
    return (
      <button
        onClick={onClick}
        style={{
          ...button.icon(32),
          backgroundColor: 'transparent',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = tokens.colors.gray[50]}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <ChevronLeft size={20} color={tokens.colors.text.primary} />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.sm,
        padding: tokens.spacing.sm,
        backgroundColor: 'transparent',
        border: 'none',
        color: tokens.colors.text.tertiary,
        fontSize: tokens.typography.sizes.md,
        fontWeight: tokens.typography.weights.light,
        cursor: 'pointer',
        marginBottom: tokens.spacing['2xl'],
        transition: tokens.transitions.all
      }}
      onMouseEnter={(e) => e.currentTarget.style.color = tokens.colors.text.primary}
      onMouseLeave={(e) => e.currentTarget.style.color = tokens.colors.text.tertiary}
    >
      <ChevronLeft size={16} />
      {label}
    </button>
  );
}
