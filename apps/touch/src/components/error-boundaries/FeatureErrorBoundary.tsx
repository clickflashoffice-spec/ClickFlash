/**
 * Feature Error Boundary
 * 
 * Comprehensive error boundary system for the Touch App.
 * Provides graceful error handling with user-friendly messages.
 * 
 * Aligned with Master App implementation for consistency.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../../utils/logger';
import { analytics } from '../../utils/telemetry';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

interface Props {
    children: ReactNode;
    feature: string;
    severity?: ErrorSeverity;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Feature Error Boundary
 * 
 * Catches errors in feature components and displays user-friendly fallback UI.
 * 
 * @example
 * <FeatureErrorBoundary feature="Photo Selection" severity="high">
 *   <PhotoSelectionScreen />
 * </FeatureErrorBoundary>
 */
export class FeatureErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        const { feature, severity = 'medium', onError } = this.props;

        // Log to telemetry analyzer
        analytics.trackError(error, `FeatureErrorBoundary: ${feature}`);

        // Update state with error info
        this.setState({ errorInfo });

        // Call custom error handler if provided
        if (onError) {
            onError(error, errorInfo);
        }

        // Send to Electron logger if available
        if (window.electron?.logger) {
            window.electron.logger.error(`[${feature}] Feature error`, {
                message: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack,
                severity
            });
        }

        // Send to Sentry in production
        if (import.meta.env.PROD && window.Sentry) {
            window.Sentry.withScope((scope) => {
                scope.setTag('feature', feature);
                scope.setTag('severity', severity);
                scope.setExtra('componentStack', errorInfo.componentStack);
                window.Sentry?.captureException(error);
            });
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

    handleExit = () => {
        if (window.electron?.exitKiosk) {
            window.electron.exitKiosk();
        } else {
            window.location.reload();
        }
    };

    getSeverityStyles(severity: ErrorSeverity): string {
        switch (severity) {
            case 'critical':
                return 'border-red-500 bg-red-50 dark:bg-red-900/20';
            case 'high':
                return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20';
            case 'medium':
                return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
            case 'low':
                return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
            default:
                return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20';
        }
    }

    getSeverityIcon(severity: ErrorSeverity): string {
        switch (severity) {
            case 'critical':
            case 'high':
                return '⚠️';
            case 'medium':
                return '⚡';
            case 'low':
                return 'ℹ️';
            default:
                return '❌';
        }
    }

    render() {
        const { hasError, error } = this.state;
        const { children, feature, severity = 'medium', fallback } = this.props;

        if (hasError) {
            // Custom fallback UI
            if (fallback) {
                return <>{fallback}</>;
            }

            // Default error UI - Touch-optimized with larger touch targets
            return (
                <div className={`rounded-xl border-2 p-8 m-4 ${this.getSeverityStyles(severity)}`}>
                    <div className="flex flex-col items-center text-center gap-6">
                        <span className="text-6xl">{this.getSeverityIcon(severity)}</span>
                        
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                {feature} Error
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 max-w-md">
                                Something went wrong in the {feature.toLowerCase()} feature.
                                {severity === 'critical' && ' This is a critical error requiring attention.'}
                            </p>
                        </div>
                        
                        {import.meta.env.DEV && error && (
                            <div className="w-full max-w-lg p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-mono overflow-auto text-left">
                                <p className="text-red-600 dark:text-red-400">{error.message}</p>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-4 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors text-lg min-w-[140px]"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="px-8 py-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-xl font-semibold transition-colors text-lg min-w-[140px]"
                            >
                                Reload
                            </button>
                            {window.electron?.exitKiosk && (
                                <button
                                    onClick={this.handleExit}
                                    className="px-8 py-4 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-xl font-semibold transition-colors text-lg min-w-[140px]"
                                >
                                    Exit App
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return children;
    }
}

/**
 * Pre-configured error boundaries for Touch App features
 */

export const PhotoSelectionErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
    <FeatureErrorBoundary feature="Photo Selection" severity="high">
        {children}
    </FeatureErrorBoundary>
);

export const OrderConfigurationErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
    <FeatureErrorBoundary feature="Order Configuration" severity="critical">
        {children}
    </FeatureErrorBoundary>
);

export const CheckoutErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
    <FeatureErrorBoundary feature="Checkout" severity="critical">
        {children}
    </FeatureErrorBoundary>
);

export const FaceSearchErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
    <FeatureErrorBoundary feature="Face Search" severity="medium">
        {children}
    </FeatureErrorBoundary>
);

export const SettingsErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
    <FeatureErrorBoundary feature="Settings" severity="medium">
        {children}
    </FeatureErrorBoundary>
);

export const KioskErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
    <FeatureErrorBoundary feature="Kiosk System" severity="high">
        {children}
    </FeatureErrorBoundary>
);

export default FeatureErrorBoundary;
