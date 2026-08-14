/**
 * Feature Error Boundary
 * 
 * Comprehensive error boundary system for the Master App.
 * Provides graceful error handling with user-friendly messages.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../../utils/logger';

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
 * <FeatureErrorBoundary feature="Album Editor" severity="high">
 *   <AlbumEditor />
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

        // Log to structured logger
        logger.error(`[${feature}] Feature error`, error, {
            componentStack: errorInfo.componentStack,
            severity,
            timestamp: new Date().toISOString()
        });

        // Update state with error info
        this.setState({ errorInfo });

        // Call custom error handler if provided
        if (onError) {
            onError(error, errorInfo);
        }

        // Send to Sentry in production
        if (import.meta.env.PROD && (window as any).Sentry) {
            (window as any).Sentry.withScope((scope: any) => {
                scope.setTag('feature', feature);
                scope.setTag('severity', severity);
                scope.setExtra('componentStack', errorInfo.componentStack);
                (window as any).Sentry.captureException(error);
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

            // Default error UI
            return (
                <div className={`rounded-lg border-2 p-6 m-4 ${this.getSeverityStyles(severity)}`}>
                    <div className="flex items-start gap-4">
                        <span className="text-4xl">{this.getSeverityIcon(severity)}</span>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                {feature} Error
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                Something went wrong in the {feature.toLowerCase()} feature. 
                                {severity === 'critical' && ' This is a critical error.'}
                            </p>
                            
                            {import.meta.env.DEV && error && (
                                <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono overflow-auto">
                                    <p className="text-red-600 dark:text-red-400">{error.message}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={this.handleReset}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={this.handleReload}
                                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg font-medium transition-colors"
                                >
                                    Reload App
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return children;
    }
}

/**
 * Pre-configured error boundaries for common features
 */

export const AlbumErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
    <FeatureErrorBoundary feature="Album Management" severity="high">
        {children}
    </FeatureErrorBoundary>
);

export const OrderErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
    <FeatureErrorBoundary feature="Order Management" severity="critical">
        {children}
    </FeatureErrorBoundary>
);

export const SettingsErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
    <FeatureErrorBoundary feature="Settings" severity="medium">
        {children}
    </FeatureErrorBoundary>
);

export const DashboardErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
    <FeatureErrorBoundary feature="Dashboard" severity="medium">
        {children}
    </FeatureErrorBoundary>
);

export const CullingErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
    <FeatureErrorBoundary feature="AI Culling" severity="low">
        {children}
    </FeatureErrorBoundary>
);

export const PhotographerErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
    <FeatureErrorBoundary feature="Photographer Management" severity="medium">
        {children}
    </FeatureErrorBoundary>
);

export default FeatureErrorBoundary;
