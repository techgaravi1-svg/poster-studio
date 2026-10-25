import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  /** Changing this clears a caught error. Pass the route to recover on navigation. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

function DefaultFallback({ error, resetError }: ErrorFallbackProps) {
  const errorMessage = error?.message || String(error || 'Internal application error');

  return (
    <div
      role="alert"
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#070b14',
        padding: '24px',
        color: '#f1f5f9',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '560px',
          width: '100%',
          background: '#0d1322',
          border: '1px solid #1e293b',
          borderRadius: '24px',
          padding: '36px 32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '18px',
        }}
      >
        {/* Status Code 500 Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#f87171',
            padding: '6px 14px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
          <span>Application Error • Code 500</span>
        </div>

        {/* Title & Description */}
        <div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#ffffff',
              margin: '0 0 8px 0',
              letterSpacing: '-0.02em',
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: '#94a3b8',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            A component encountered an unhandled exception (Error 500). Your cart and account data have been preserved in safe storage.
          </p>
        </div>

        {/* Technical Error Details (Collapsible) */}
        <div
          style={{
            width: '100%',
            background: '#070b14',
            border: '1px solid #1e2638',
            borderRadius: '12px',
            padding: '12px 14px',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '6px',
            }}
          >
            Server / Client Diagnostic Info
          </div>
          <div
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '12px',
              color: '#fca5a5',
              wordBreak: 'break-word',
              maxHeight: '120px',
              overflowY: 'auto',
              lineHeight: 1.4,
            }}
          >
            {errorMessage}
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            justifyContent: 'center',
            width: '100%',
            marginTop: '8px',
          }}
        >
          <button
            type="button"
            onClick={resetError}
            style={{
              background: '#38bdf8',
              color: '#070b14',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'transform 0.15s ease, opacity 0.15s ease',
            }}
          >
            Try Again
          </button>

          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: '#161f33',
              color: '#e2e8f0',
              border: '1px solid #2a3754',
              borderRadius: '12px',
              padding: '12px 20px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href = '/';
            }}
            style={{
              background: 'transparent',
              color: '#94a3b8',
              border: '1px solid transparent',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: toError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(
      'ErrorBoundary caught an error:',
      toError(error),
      info.componentStack,
    );
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.error !== null &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }
    const Fallback = this.props.FallbackComponent ?? DefaultFallback;
    return <Fallback error={error} resetError={this.resetError} />;
  }
}
