import React, { Component, ReactNode, ErrorInfo } from "react";
import { logger } from "../../utils/logger";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class DashboardErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = { hasError: false }; constructor(props: ErrorBoundaryProps) {
    super(props);
    (this as any).state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    logger.error("Dashboard Error Boundary caught error:", error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error("Error Boundary details:", error, {
      componentStack: errorInfo.componentStack,
    });
  }

  render(): React.ReactNode {
    if ((this as any).state.hasError) {
      if ((this as any).props.fallback) return (this as any).props.fallback;

      return (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Something went wrong
          </h3>
          <p className="text-sm text-red-600 dark:text-red-300">
            {(this as any).state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => {
              if ((this as any).props.onReset) (this as any).props.onReset();
              (this as any).setState({ hasError: false });
            }}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
