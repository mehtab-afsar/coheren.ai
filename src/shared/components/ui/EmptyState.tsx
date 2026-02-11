import type { CSSProperties } from 'react';
import { tokens } from '@core/design-system';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  style?: CSSProperties;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  style,
}: EmptyStateProps) {
  return (
    <div
      style={{
        backgroundColor: tokens.colors.surface,
        padding: tokens.spacing['4xl'],
        borderRadius: tokens.borderRadius.lg,
        border: `1px solid ${tokens.colors.borderLight}`,
        boxShadow: tokens.shadows.sm,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: tokens.spacing.xl,
        ...style,
      }}
    >
      {/* Icon */}
      {Icon && (
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: tokens.borderRadius.full,
            backgroundColor: tokens.colors.primarySubtle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon
            size={32}
            strokeWidth={1.5}
            color={tokens.colors.primary}
          />
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: '400px' }}>
        <h3
          style={{
            fontSize: tokens.typography.sizes.lg,
            fontWeight: tokens.typography.weights.medium,
            color: tokens.colors.text.primary,
            marginBottom: tokens.spacing.sm,
            lineHeight: tokens.typography.lineHeights.snug,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: tokens.typography.sizes.base,
            fontWeight: tokens.typography.weights.light,
            color: tokens.colors.text.secondary,
            lineHeight: tokens.typography.lineHeights.relaxed,
          }}
        >
          {description}
        </p>
      </div>

      {/* Action Button */}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
            backgroundColor: tokens.colors.primary,
            color: tokens.colors.text.inverse,
            border: 'none',
            borderRadius: tokens.borderRadius.md,
            fontSize: tokens.typography.sizes.base,
            fontWeight: tokens.typography.weights.regular,
            cursor: 'pointer',
            transition: tokens.transitions.all,
            boxShadow: tokens.shadows.xs,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = tokens.colors.primaryHover;
            e.currentTarget.style.transform = `scale(${tokens.colors.state.hoverScale})`;
            e.currentTarget.style.boxShadow = tokens.shadows.sm;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = tokens.colors.primary;
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = tokens.shadows.xs;
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Preset empty states for common scenarios
export function NoTasksEmptyState({ onAddTask }: { onAddTask?: () => void }) {
  return (
    <EmptyState
      title="No tasks for today"
      description="Take a moment to plan your day, or come back tomorrow for your next set of tasks."
      action={onAddTask ? {
        label: 'Plan Your Day',
        onClick: onAddTask,
      } : undefined}
    />
  );
}

export function NoGoalsEmptyState({ onAddGoal }: { onAddGoal?: () => void }) {
  return (
    <EmptyState
      title="No goals yet"
      description="Start your journey by setting a meaningful goal. Break it down into actionable steps and track your progress."
      action={onAddGoal ? {
        label: 'Set Your First Goal',
        onClick: onAddGoal,
      } : undefined}
    />
  );
}
