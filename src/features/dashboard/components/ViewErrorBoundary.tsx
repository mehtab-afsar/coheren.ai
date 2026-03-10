import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { tokens } from '@core/design-system';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ViewErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // In production this would go to Sentry / error monitoring
    console.error('[ViewErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: tokens.spacing['3xl'],
          gap: tokens.spacing.lg,
          textAlign: 'center',
          minHeight: '240px',
          backgroundColor: tokens.colors.surface,
          border: `1px solid ${tokens.colors.borderLight}`,
          borderRadius: tokens.borderRadius.xl,
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: 'rgba(239,68,68,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <AlertTriangle size={24} color={tokens.colors.error} />
          </div>
          <div>
            <h2 style={{
              fontSize: tokens.typography.sizes.lg,
              fontWeight: tokens.typography.weights.semibold,
              color: tokens.colors.text.primary,
              margin: '0 0 8px',
              letterSpacing: '-0.02em',
            }}>
              Something went wrong
            </h2>
            <p style={{
              fontSize: tokens.typography.sizes.sm,
              color: tokens.colors.text.secondary,
              margin: 0,
              lineHeight: 1.5,
              maxWidth: '280px',
            }}>
              {this.state.error?.message || 'An unexpected error occurred in this view.'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            style={{
              padding: `${tokens.spacing.sm} ${tokens.spacing.xl}`,
              backgroundColor: '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: tokens.borderRadius.md,
              cursor: 'pointer',
              fontSize: tokens.typography.sizes.sm,
              fontWeight: tokens.typography.weights.medium,
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
