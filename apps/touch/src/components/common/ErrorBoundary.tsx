
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../../utils/logger';
import { analytics } from '../../utils/telemetry';

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
 */
interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback?: ReactNode;
  subtle?: boolean;
  screenName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorId: string | null;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    errorId: null,
    error: null,
    errorInfo: null
  };

  /**
   * Update state so the next render will show the fallback UI
   * Called when an error is thrown in a child component
   */
  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substring(2, 9).toUpperCase()
    };
  }

  /**
   * Log error information when an error is caught
   * Called after an error has been thrown by a descendant component
   */
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Store error info for display
    this.setState({ errorInfo });

    const screenName = (this.props as ErrorBoundaryProps).screenName || "ErrorBoundary";
    analytics.trackError(error, screenName);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (this.props.subtle) {
        return (
          <div className="bg-slate-800 border border-red-500/20 rounded-xl p-6 flex items-center justify-between text-slate-300">
            <div className="flex items-center gap-4">
              <div className="bg-red-500/10 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white">{(this.props as ErrorBoundaryProps).screenName || 'Component'} Error</span>
                <span className="text-xs text-slate-500 font-mono">Reference: {this.state.errorId}</span>
              </div>
            </div>
            <button
              onClick={() => this.setState({ hasError: false, errorId: null, error: null, errorInfo: null })}
              className="p-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-blue-400 transition-all active:scale-95"
              title="Reload Component"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center font-sans relative z-50">
          <div className="bg-red-500/10 p-6 rounded-full mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-2">System Encountered an Error</h1>
          <p className="text-slate-400 mb-8 max-w-md">
            Something went wrong within the application. The system has been paused to prevent data loss.
          </p>
          <div className="bg-slate-800 p-4 rounded-lg mb-8 max-w-lg w-full overflow-auto text-left border border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Error Log (ID: {this.state.errorId})</p>
              <button
                onClick={() => navigator.clipboard.writeText(this.state.errorId || '')}
                className="text-[10px] text-blue-400 hover:text-blue-300"
              >
                Copy ID
              </button>
            </div>
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
          <div className="flex space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg shadow-blue-600/20"
            >
              Restart System
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded-lg transition-colors border border-slate-600"
            >
              Return to Launcher
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
