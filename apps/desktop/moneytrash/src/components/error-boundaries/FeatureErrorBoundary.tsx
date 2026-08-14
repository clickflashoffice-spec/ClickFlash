/**
 * Feature Error Boundary
 * 
 * React error boundary component that catches errors in child components
 * and displays a fallback UI. Specifically designed for the upload feature.
 */

import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertCircle, RefreshCw, Home, Upload } from 'lucide-react';
import { logger } from '@/utils/logger';

/** Props for FeatureErrorBoundary */
interface FeatureErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  
  /** Optional custom fallback component */
  fallback?: ReactNode;
  
  /** Optional callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  
  /** Feature name for logging */
  featureName?: string;
  
  /** Whether to show reset button */
  showReset?: boolean;
  
  /** Callback when reset is clicked */
  onReset?: () => void;
}

/** State for FeatureErrorBoundary */
interface FeatureErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The caught error */
  error: Error | null;
  /** Error info from React */
  errorInfo: ErrorInfo | null;
}

/**
 * Feature Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in its child component tree,
 * logs those errors, and displays a fallback UI instead of the
 * component tree that crashed.
 * 
 * @example
 * ```tsx
 * <FeatureErrorBoundary featureName="UploadPanel">
 *   <UploadPanel />
 * </FeatureErrorBoundary>
 * ```
 */
export class FeatureErrorBoundary extends Component<
  FeatureErrorBoundaryProps,
  FeatureErrorBoundaryState
> {
  constructor(props: FeatureErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): FeatureErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { featureName, onError } = this.props;
    
    // Log the error
    logger.error(
      `Error caught in ${featureName || 'feature'} boundary`,
      error,
      { 
        componentStack: errorInfo.componentStack,
        feature: featureName 
      }
    );

    this.setState({ errorInfo });

    // Call optional callback
    if (onError) {
      onError(error, errorInfo);
    }
  }

  handleReset = () => {
    const { onReset } = this.props;
    
    this.setState({ hasError: false, error: null, errorInfo: null });
    
    if (onReset) {
      onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback, showReset = true, featureName } = this.props;

    if (!hasError) {
      return children;
    }

    // Custom fallback
    if (fallback) {
      return fallback;
    }

    // Default error UI
    return (
      <div className="min-h-[400px] flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-[#131C31]/50 border border-red-500/30 rounded-2xl p-8 text-center">
          {/* Error Icon */}
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>

          {/* Error Title */}
          <h2 className="text-xl font-bold text-white mb-2">
            Something went wrong
          </h2>
          
          {featureName && (
            <p className="text-sm text-white/60 mb-4">
              Error in {featureName}
            </p>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-black/50 rounded-lg p-4 mb-6 text-left">
              <p className="text-xs text-white/60 uppercase tracking-wider mb-2">
                Error Details
              </p>
              <p className="text-sm text-red-400 font-mono break-all">
                {error.message}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {showReset && (
              <button
                onClick={this.handleReset}
                className="w-full px-4 py-3 bg-red-500 hover:bg-red-400 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors text-sm"
              >
                Reload Page
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>
          </div>

          {/* Support Info */}
          <p className="text-xs text-white/50 mt-6">
            If this problem persists, please contact support with the error details above.
          </p>
        </div>
      </div>
    );
  }
}

/**
 * Upload-specific error boundary with custom styling
 */
export function UploadErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <FeatureErrorBoundary
      featureName="Upload Feature"
      fallback={
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-[#131C31]/50 border border-yellow-500/30 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 bg-[#06B6D4]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Upload className="w-10 h-10 text-[#06B6D4]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Upload Temporarily Unavailable
            </h2>
            <p className="text-sm text-white/70 mb-6">
              We&apos;re having trouble with the upload feature. Your files are safe and you can try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-[#06B6D4] hover:bg-[#06B6D4]/80 text-black font-medium rounded-xl transition-colors"
            >
              Retry Upload
            </button>
          </div>
        </div>
      }
    >
      {children}
    </FeatureErrorBoundary>
  );
}

/**
 * HOC to wrap a component with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  boundaryProps?: Omit<FeatureErrorBoundaryProps, 'children'>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <FeatureErrorBoundary {...boundaryProps}>
      <Component {...props} />
    </FeatureErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default FeatureErrorBoundary;
