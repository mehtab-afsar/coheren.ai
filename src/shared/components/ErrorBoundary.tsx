import { Component, type ErrorInfo, type ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { tokens } from '@core/design-system';

interface Props {
  children: ReactNode;
  /** Optional label shown in the error header (e.g. "Dashboard") */
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? ` – ${this.props.label}` : ''}]`, error, info.componentStack);
    Sentry.captureException(error, { extra: { componentStack: info.componentStack, label: this.props.label } });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tokens.colors.background,
        padding: '24px',
      }}>
        <div style={{
          maxWidth: '420px',
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239,68,68,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '24px',
          }}>
            ⚠️
          </div>

          <h2 style={{
            fontSize: '20px',
            fontWeight: tokens.typography.weights.semibold,
            color: tokens.colors.text.primary,
            marginBottom: '8px',
          }}>
            Something went wrong
          </h2>

          <p style={{
            fontSize: tokens.typography.sizes.sm,
            color: tokens.colors.text.secondary,
            lineHeight: 1.6,
            marginBottom: '28px',
          }}>
            {this.props.label
              ? `The ${this.props.label} ran into an unexpected error.`
              : 'An unexpected error occurred.'}
            {' '}Your data is safe — try refreshing.
          </p>

          {this.state.error && (
            <details style={{
              marginBottom: '24px',
              textAlign: 'left',
              backgroundColor: '#FEF2F2',
              borderRadius: '8px',
              padding: '12px',
            }}>
              <summary style={{
                fontSize: '12px',
                color: '#EF4444',
                cursor: 'pointer',
                fontWeight: tokens.typography.weights.medium,
              }}>
                Error details
              </summary>
              <pre style={{
                marginTop: '8px',
                fontSize: '11px',
                color: '#7F1D1D',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {this.state.error.message}
              </pre>
            </details>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '11px 28px',
                backgroundColor: tokens.colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: tokens.borderRadius.lg,
                fontSize: tokens.typography.sizes.sm,
                fontWeight: tokens.typography.weights.semibold,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>

            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '11px 28px',
                backgroundColor: 'white',
                color: tokens.colors.text.secondary,
                border: `1.5px solid ${tokens.colors.border}`,
                borderRadius: tokens.borderRadius.lg,
                fontSize: tokens.typography.sizes.sm,
                fontWeight: tokens.typography.weights.medium,
                cursor: 'pointer',
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
