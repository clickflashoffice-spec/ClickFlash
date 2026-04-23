
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../../utils/logger';

/**
 * ErrorBoundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 * 
 * Features:
 * - Catches rendering errors, lifecycle errors, and errors in constructors
 * - Logs errors with full context for debugging
 * - Provides user-friendly error UI with recovery options
 * - Prevents entire app from crashing due to component errors
 * - Supports error recovery without full page reload
 * - Customizable fallback messages
 */
/**
 * ErrorBoundary Component Props
 * 
 * @interface ErrorBoundaryProps
 * @property {ReactNode} [children] - Child components to wrap with error boundary
 * @property {() => void} [onReset] - Optional callback when error is reset
 * @property {string} [fallbackTitle] - Custom error title (default: "System Encountered an Error")
 * @property {string} [fallbackMessage] - Custom error message
 */
interface ErrorBoundaryProps {
  children?: ReactNode;
  onReset?: () => void;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

/**
 * ErrorBoundary Component State
 * 
 * @interface ErrorBoundaryState
 * @property {boolean} hasError - Whether an error has been caught
 * @property {Error | null} error - The error that was caught
 * @property {ErrorInfo | null} errorInfo - Additional error information from React
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  /**
   * Update state so the next render will show the fallback UI
   * Called when an error is thrown in a child component
   */
  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  /**
   * Log error information when an error is caught
   * Called after an error has been thrown by a descendant component
   * 
   * @param {Error} error - The error that was thrown
   * @param {ErrorInfo} errorInfo - Additional error information from React
   */
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Store error info for display
    this.setState({ errorInfo });
    
    logger.error("ErrorBoundary caught an error", error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Reset error boundary state
   * Allows recovery from errors without full page reload
   */
  public resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Call optional reset callback
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (resetError) {
        logger.error("Error in onReset callback", resetError);
      }
    }
  };

  /**
   * Render component
   * 
   * @returns {ReactNode} Either the children (if no error) or error fallback UI
   */
  public render(): ReactNode {
    if (this.state.hasError) {
      const { fallbackTitle, fallbackMessage } = this.props;
      const errorMessage = this.state.error?.message || 'Unknown error';
      const isDevelopment = import.meta.env.MODE === 'development';
      
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center font-sans relative z-50">
          <div className="bg-red-500/10 p-6 rounded-full mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            {fallbackTitle || 'System Encountered an Error'}
          </h1>
          <p className="text-slate-400 mb-4 max-w-md">
            {fallbackMessage || 'Something went wrong within the application. The system has been paused to prevent data loss.'}
          </p>
          {errorMessage && (
            <p className="text-red-400 mb-8 max-w-md font-semibold">
              {errorMessage}
            </p>
          )}
          
          {/* Show error details only in development */}
          {isDevelopment && (this.state.error?.stack || this.state.errorInfo?.componentStack) && (
            <div className="bg-slate-800 p-4 rounded-lg mb-8 max-w-lg w-full overflow-auto text-left border border-slate-700">
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Error Details (Development Only)</p>
              <code className="font-mono text-red-400 text-sm break-all whitespace-pre-wrap">
                {this.state.error?.toString() || 'Unknown error'}
                {this.state.error?.stack && (
                  <>
                    {'\n\nStack Trace:\n'}
                    {this.state.error.stack}
                  </>
                )}
                {this.state.errorInfo?.componentStack && (
                  <>
                    {'\n\nComponent Stack:\n'}
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </code>
            </div>
          )}
          
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={this.resetErrorBoundary}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg shadow-blue-600/20"
              aria-label="Try again"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded-lg transition-colors border border-slate-600"
              aria-label="Reload page"
            >
              Reload Page
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded-lg transition-colors border border-slate-600"
              aria-label="Return to launcher"
            >
              Return to Launcher
            </button>
          </div>
        </div>
      );
    }

    return this.props.children || null;
  }
}

export default ErrorBoundary;
