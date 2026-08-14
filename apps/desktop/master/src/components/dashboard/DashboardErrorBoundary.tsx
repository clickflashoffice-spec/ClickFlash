import React from "react";
import { logger } from "../../utils/logger";

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class DashboardErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  declare state: ErrorBoundaryState;
  declare props: Readonly<ErrorBoundaryProps>;
  declare setState: (state: any) => void;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
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
    const state = (this as any).state as ErrorBoundaryState;
    const props = (this as any).props as ErrorBoundaryProps;
    if (state.hasError) {
      if (props.fallback) return props.fallback;

      return (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Something went wrong
          </h3>
          <p className="text-sm text-red-600 dark:text-red-300">
            {state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => {
              if (props.onReset) props.onReset();
              (this as any).setState({ hasError: false });
            }}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return props.children;
  }
}
