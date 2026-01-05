import { ArrowRight, ChevronLeft } from 'lucide-react';
import { tokens, button, text, hoverHandlers } from '../../design-system';

interface NavigationFooterProps {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
  backLabel?: string;
  variant?: 'default' | 'centered';
  helperText?: string;
}

export function NavigationFooter({
  onBack,
  onNext,
  nextLabel = 'Next',
  nextDisabled = false,
  showBack = true,
  backLabel = 'Back',
  variant = 'default',
  helperText,
}: NavigationFooterProps) {
  if (variant === 'centered') {
    return (
      <div style={{ textAlign: 'center' }}>
        {onNext && (
          <button
            onClick={onNext}
            disabled={nextDisabled}
            style={{
              ...(nextDisabled ? button.disabled : button.primary),
              borderRadius: tokens.borderRadius.full,
              letterSpacing: '0.05em',
            }}
            {...(!nextDisabled ? hoverHandlers.darkBg : {})}
          >
            <span>{nextLabel}</span>
            <ArrowRight size={16} />
          </button>
        )}

        {helperText && (
          <p style={{
            ...text.caption,
            marginTop: tokens.spacing.lg
          }}>
            {helperText}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        gap: tokens.spacing.md,
        marginTop: tokens.spacing['2xl']
      }}>
        {showBack && onBack && (
          <button
            onClick={onBack}
            style={{
              ...button.secondary,
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing.sm,
              padding: `${tokens.spacing.md} ${tokens.spacing.xl}`
            }}
            {...hoverHandlers.lightBg}
          >
            <ChevronLeft size={16} />
            {backLabel}
          </button>
        )}

        {onNext && (
          <button
            onClick={onNext}
            disabled={nextDisabled}
            style={{
              ...(nextDisabled ? button.disabled : button.primary),
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: tokens.spacing.sm
            }}
            {...(!nextDisabled ? hoverHandlers.darkBg : {})}
          >
            {nextLabel}
            <ArrowRight size={16} />
          </button>
        )}
      </div>

      {helperText && (
        <p style={{
          ...text.caption,
          textAlign: 'center',
          marginTop: tokens.spacing.lg
        }}>
          {helperText}
        </p>
      )}
    </div>
  );
}
