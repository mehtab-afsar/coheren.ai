import { ChevronRight } from 'lucide-react';
import { tokens, text } from '../../design-system';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; onClick?: () => void }>;
}

export function AppHeader({ title, subtitle, actions, breadcrumbs }: AppHeaderProps) {
  return (
    <div
      style={{
        borderBottom: `1px solid ${tokens.colors.gray[200]}`,
        padding: `${tokens.spacing.lg} ${tokens.spacing['2xl']}`,
        backgroundColor: tokens.colors.background,
      }}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            marginBottom: tokens.spacing.sm,
          }}
        >
          {breadcrumbs.map((crumb, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing.sm,
              }}
            >
              {crumb.onClick ? (
                <button
                  onClick={crumb.onClick}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    ...text.bodySmall,
                    color: tokens.colors.text.secondary,
                    transition: tokens.transitions.colors,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = tokens.colors.text.primary)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = tokens.colors.text.secondary)
                  }
                >
                  {crumb.label}
                </button>
              ) : (
                <span
                  style={{
                    ...text.bodySmall,
                    color:
                      index === breadcrumbs.length - 1
                        ? tokens.colors.text.primary
                        : tokens.colors.text.secondary,
                  }}
                >
                  {crumb.label}
                </span>
              )}
              {index < breadcrumbs.length - 1 && (
                <ChevronRight size={14} color={tokens.colors.text.tertiary} />
              )}
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          {title && <h1 style={text.h3}>{title}</h1>}
          {subtitle && (
            <p
              style={{
                ...text.bodySmall,
                color: tokens.colors.text.secondary,
                marginTop: tokens.spacing.xs,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div>{actions}</div>}
      </div>
    </div>
  );
}
