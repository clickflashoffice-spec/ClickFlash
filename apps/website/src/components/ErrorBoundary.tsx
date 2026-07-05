"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors in child components and displays a fallback UI.
 * Essential for 3D components (Three.js/React Three Fiber) that may fail
 * due to WebGL issues or device limitations.
 * 
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<FallbackUI />}>
 *   <ThreeDScene />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Log to analytics in production
    if (process.env.NODE_ENV === "production") {
      // Safely capture exception for structured logging / Sentry
      try {
        if (typeof window !== 'undefined' && (window as any).Sentry) {
          (window as any).Sentry.captureException(error, { extra: errorInfo });
        } else {
          console.error("[Production Error]", { error, errorInfo });
        }
      } catch (loggingError) {
        // Prevent telemetry failure from crashing the boundary
        console.error("Failed to log error", loggingError);
      }
    }
  }

  public componentDidUpdate(prevProps: Props) {
    if (
      this.props.resetOnPropsChange &&
      prevProps.children !== this.props.children
    ) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default Error Fallback UI
 */
interface ErrorFallbackProps {
  error: Error | null;
  onRetry?: () => void;
}

export function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  const isWebGLError = error?.message?.toLowerCase().includes("webgl") ||
    error?.message?.toLowerCase().includes("three.js") ||
    error?.message?.toLowerCase().includes("canvas");

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto bg-amber-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-amber-600" aria-hidden="true" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-slate-900">
          {isWebGLError ? "Graphics Error" : "Something went wrong"}
        </h2>

        {/* Description */}
        <p className="text-slate-600">
          {isWebGLError
            ? "Your browser or device may not support the required graphics features. Try updating your browser or using a different device."
            : "We apologize for the inconvenience. The application encountered an unexpected error."}
        </p>

        {/* Error Details (Development Only) */}
        {process.env.NODE_ENV === "development" && error && (
          <div className="text-left bg-slate-100 rounded-lg p-4 overflow-auto max-h-40">
            <p className="text-sm font-mono text-red-600 break-all">
              {error.toString()}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500 text-white font-semibold rounded-lg hover:bg-cyan-600 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>

        {/* Support Link */}
        <p className="text-sm text-slate-500">
          Need help?{" "}
          <Link href="/contact" className="text-cyan-600 hover:underline">
            Contact our support team
          </Link>
        </p>
      </div>
    </div>
  );
}

/**
 * 3D Scene Error Boundary
 * 
 * Specialized error boundary for Three.js/React Three Fiber components.
 * Handles WebGL context loss and provides graceful fallback.
 */
export function SceneErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={<ThreeDFallback />}
      onError={(error) => {
        console.warn("3D Scene Error:", error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * 3D Fallback Component
 * 
 * Displays when 3D content fails to load.
 */
function ThreeDFallback() {
  return (
    <div className="relative w-full h-full min-h-[400px] bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center overflow-hidden rounded-lg">
      {/* Static Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, white 1px, transparent 1px),
                           radial-gradient(circle at 75% 75%, white 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center p-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          3D View Unavailable
        </h3>
        <p className="text-slate-400 max-w-xs mx-auto text-sm">
          Your device doesn&apos;t support WebGL, or 3D graphics are disabled.
          The content is still accessible without 3D visualization.
        </p>
      </div>
    </div>
  );
}

/**
 * Lazy Loaded 3D Component Wrapper
 * 
 * Dynamically imports Three.js components to reduce initial bundle size.
 */
interface Lazy3DComponentProps {
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  fallback?: ReactNode;
  props?: Record<string, unknown>;
}

export function Lazy3DComponent({
  component: Component,
  fallback = <ThreeDLoadingFallback />,
  props = {},
}: Lazy3DComponentProps) {
  return (
    <ErrorBoundary fallback={<ThreeDFallback />}>
      <React.Suspense fallback={fallback}>
        <Component {...props} />
      </React.Suspense>
    </ErrorBoundary>
  );
}

/**
 * 3D Loading Fallback
 * 
 * Shown while 3D components are being loaded.
 */
function ThreeDLoadingFallback() {
  return (
    <div className="w-full h-full min-h-[400px] bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading 3D Experience...</p>
      </div>
    </div>
  );
}

export default ErrorBoundary;
