// @ts-nocheck
import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { BrowserLogger } from '@clickflash/logger';

const logger = new BrowserLogger('clickflash-ui');

/**
 * Shared Error Boundary for all ClickFlash apps.
 *
 * Catches React rendering errors and displays a recovery UI.
 * Prevents the entire app from crashing due to component errors.
 *
 * Features:
 * - Custom static or functional fallback UI
 * - Auto-reset via `resetKey` prop changes
 * - ClickFlash-branded default error UI with gradient styling
 * - Development-only error message display
 *
 * Usage:
 *   import { ErrorBoundary } from '@clickflash/ui';
 *
 *   // Static fallback
 *   <ErrorBoundary fallback={<p>Something went wrong</p>}>
 *     <MyComponent />
 *   </ErrorBoundary>
 *
 *   // Functional fallback with reset
 *   <ErrorBoundary fallback={(error, reset) => (
 *     <div>
 *       <p>{error.message}</p>
 *       <button onClick={reset}>Retry</button>
 *     </div>
 *   )}>
 *     <MyComponent />
 *   </ErrorBoundary>
 *
 *   // Auto-reset on route change
 *   <ErrorBoundary resetKey={pathname}>
 *     <MyComponent />
 *   </ErrorBoundary>
 */

interface ErrorBoundaryProps {
  /** Children to render */
  children: ReactNode;
  /** Custom fallback UI — static ReactNode or function receiving (error, reset) */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Optional key to auto-reset the boundary when it changes */
  resetKey?: string | number;
  /** Component name for logging context */
  componentName?: string;
  /** Callback fired when the error boundary is manually reset */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  /** Tracked resetKey for getDerivedStateFromProps comparison */
  prevResetKey: string | number | undefined;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static displayName = 'ErrorBoundary';

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      prevResetKey: props.resetKey,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `err-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    };
  }

  /**
   * Auto-reset the error boundary when `resetKey` changes.
   * This allows parent components to recover from errors by changing
   * a key (e.g., route path, query param, or a counter).
   */
  static getDerivedStateFromProps(
    nextProps: ErrorBoundaryProps,
    prevState: ErrorBoundaryState,
  ): Partial<ErrorBoundaryState> | null {
    if (
      prevState.prevResetKey !== undefined &&
      nextProps.resetKey !== prevState.prevResetKey &&
      prevState.hasError
    ) {
      return {
        hasError: false,
        error: null,
        errorId: null,
        prevResetKey: nextProps.resetKey,
      };
    }

    // Always keep prevResetKey in sync even when not resetting
    if (nextProps.resetKey !== prevState.prevResetKey) {
      return { prevResetKey: nextProps.resetKey };
    }

    return null;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, componentName } = this.props;

    // Log the error using structured logger
    const context = componentName ? `[${componentName}] ` : '';
    logger.error(`${context}Caught error: ${error.message}`, error, {
      componentStack: errorInfo.componentStack,
    });

    // Call optional error callback
    if (onError) {
      onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null, errorId: null });
  };

  render(): ReactNode {
    const { hasError, error, errorId } = this.state;
    const { fallback, children } = this.props;

    if (hasError && error) {
      // Functional fallback — provides error and reset callback
      if (typeof fallback === 'function') {
        return (fallback as (error: Error, reset: () => void) => ReactNode)(
          error,
          this.handleReset,
        );
      }

      // Static ReactNode fallback
      if (fallback !== undefined && fallback !== null) {
        return fallback;
      }

      // Default ClickFlash-branded error UI
      const isDev = process.env.NODE_ENV === 'development';

      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2.5rem 2rem',
            minHeight: '240px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(168, 85, 247, 0.08) 50%, rgba(236, 72, 153, 0.06) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            textAlign: 'center',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Error icon with gradient circle */}
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(236, 72, 153, 0.12))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)',
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          {/* Title */}
          <h3
            style={{
              margin: '0 0 0.5rem 0',
              background: 'linear-gradient(135deg, #ef4444, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontSize: '1.125rem',
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            Something went wrong
          </h3>

          {/* Error message — development only */}
          {isDev && error.message && (
            <p
              style={{
                margin: '0 0 0.25rem 0',
                color: '#6b7280',
                fontSize: '0.8125rem',
                maxWidth: '440px',
                lineHeight: 1.5,
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                padding: '0.5rem 0.75rem',
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                borderRadius: '6px',
                wordBreak: 'break-word',
              }}
            >
              {error.message}
            </p>
          )}

          <p
            style={{
              margin: '0 0 1.25rem 0',
              color: '#9ca3af',
              fontSize: '0.8125rem',
              maxWidth: '360px',
              lineHeight: 1.5,
            }}
          >
            Don&apos;t worry — your data is safe. Click below to try again.
          </p>

          {/* Try Again button with ClickFlash brand gradient */}
          <button
            onClick={this.handleReset}
            type="button"
            style={{
              padding: '0.625rem 2rem',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 200ms ease',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
              letterSpacing: '0.01em',
            }}
            onMouseOver={(e) => {
              const btn = e.currentTarget;
              btn.style.background = 'linear-gradient(135deg, #4f46e5, #9333ea)';
              btn.style.boxShadow = '0 4px 16px rgba(99, 102, 241, 0.4)';
              btn.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              const btn = e.currentTarget;
              btn.style.background = 'linear-gradient(135deg, #6366f1, #a855f7)';
              btn.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)';
              btn.style.transform = 'translateY(0)';
            }}
          >
            Try Again
          </button>

          {/* Error ID for support reference */}
          {errorId && (
            <p
              style={{
                margin: '1rem 0 0 0',
                color: '#d1d5db',
                fontSize: '0.6875rem',
                letterSpacing: '0.02em',
              }}
            >
              Ref: {errorId}
            </p>
          )}
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;

