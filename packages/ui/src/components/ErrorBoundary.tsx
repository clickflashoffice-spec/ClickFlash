import React, { Component, type ReactNode, type ErrorInfo } from 'react';

/**
 * Shared Error Boundary for all ClickFlash apps.
 *
 * Catches React rendering errors and displays a recovery UI.
 * Prevents the entire app from crashing due to component errors.
 *
 * Usage:
 *   import { ErrorBoundary } from '@clickflash/ui';
 *
 *   <ErrorBoundary fallback={<p>Something went wrong</p>}>
 *     <MyComponent />
 *   </ErrorBoundary>
 */

interface ErrorBoundaryProps {
  /** Optional custom fallback UI to render on error */
  fallback?: ReactNode;
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Component name for logging context */
  componentName?: string;
  /** Children to render */
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static displayName = 'ErrorBoundary';

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `err-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, componentName } = this.props;

    // Log the error (use structured logger when available)
    const context = componentName ? `[${componentName}]` : '';
    console.error(`[ErrorBoundary]${context} Caught error:`, error, errorInfo.componentStack);

    // Call optional error callback
    if (onError) {
      onError(error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorId: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback takes priority
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            minHeight: '200px',
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            textAlign: 'center',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              fontSize: '24px',
            }}
          >
            ⚠️
          </div>
          <h3
            style={{
              margin: '0 0 0.5rem 0',
              color: '#ef4444',
              fontSize: '1.125rem',
              fontWeight: 600,
            }}
          >
            Something went wrong
          </h3>
          <p
            style={{
              margin: '0 0 1rem 0',
              color: '#6b7280',
              fontSize: '0.875rem',
              maxWidth: '400px',
            }}
          >
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 150ms',
            }}
            onMouseOver={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#2563eb'; }}
            onMouseOut={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#3b82f6'; }}
          >
            Try Again
          </button>
          {this.state.errorId && (
            <p style={{ margin: '0.75rem 0 0 0', color: '#9ca3af', fontSize: '0.75rem' }}>
              Error ID: {this.state.errorId}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
