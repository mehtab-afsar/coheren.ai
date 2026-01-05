import { tokens, text } from '../../design-system';
import { BackButton } from './BackButton';
import { ProgressIndicator } from './ProgressIndicator';

interface PageHeaderProps {
  variant?: 'onboarding' | 'dashboard' | 'settings';
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  actions?: React.ReactNode;
  showProgress?: boolean;
  progress?: {
    current: number;
    total: number;
  };
}

export function PageHeader({
  variant = 'onboarding',
  title,
  subtitle,
  onBack,
  backLabel = 'Back',
  actions,
  showProgress,
  progress,
}: PageHeaderProps) {
  if (variant === 'onboarding') {
    return (
      <div>
        {onBack && (
          <BackButton onClick={onBack} label={backLabel} variant="inline" />
        )}

        {showProgress && progress && (
          <ProgressIndicator
            current={progress.current}
            total={progress.total}
            showLabels
            labelFormat="question"
          />
        )}

        {(title || subtitle) && (
          <div
            style={{
              textAlign: 'center',
              marginBottom: tokens.spacing['3xl'],
            }}
          >
            {title && <h2 style={text.h1}>{title}</h2>}
            {subtitle && (
              <p
                style={{
                  ...text.body,
                  marginTop: tokens.spacing.sm,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <div
        style={{
          backgroundColor: tokens.colors.primary,
          borderBottom: `1px solid ${tokens.colors.gray[200]}`,
          padding: `${tokens.spacing.xl} ${tokens.spacing['2xl']}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            {title && (
              <h1
                style={{
                  ...text.h3,
                  marginBottom: tokens.spacing.xs,
                }}
              >
                {title}
              </h1>
            )}
            {subtitle && <p style={text.body}>{subtitle}</p>}
          </div>
          {actions}
        </div>
      </div>
    );
  }

  if (variant === 'settings') {
    return (
      <div
        style={{
          borderBottom: `1px solid ${tokens.colors.gray[200]}`,
          padding: `${tokens.spacing.lg} ${tokens.spacing['2xl']}`,
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.md,
        }}
      >
        {onBack && <BackButton onClick={onBack} variant="header" />}
        <h1
          style={{
            ...text.h3,
            fontWeight: tokens.typography.weights.light,
          }}
        >
          {title}
        </h1>
      </div>
    );
  }

  return null;
}
