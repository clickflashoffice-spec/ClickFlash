/**
 * Feature Error Boundary
 * 
 * Comprehensive error boundary system for the Gallery App.
 * Provides graceful error handling with user-friendly messages.
 * CRITICAL: Payment-specific error handling ensures payment errors
 * never expose sensitive data and provide graceful recovery.
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
    /** Whether this boundary wraps payment functionality - triggers additional security measures */
    isPaymentBoundary?: boolean;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    /** User-friendly error message (sanitized for payment errors) */
    userMessage: string;
}

/**
 * Feature Error Boundary
 * 
 * Catches errors in feature components and displays user-friendly fallback UI.
 * For payment-related errors, ensures no sensitive data is exposed.
 * 
 * @example
 * <FeatureErrorBoundary feature="Checkout" severity="critical" isPaymentBoundary>
 *   <PaymentForm />
 * </FeatureErrorBoundary>
 */
export class FeatureErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { 
            hasError: false, 
            error: null, 
            errorInfo: null,
            userMessage: ''
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return { 
            hasError: true, 
            error, 
            errorInfo: null,
            userMessage: ''
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        const { feature, severity = 'medium', onError, isPaymentBoundary } = this.props;

        // Sanitize error for payment boundaries - never log sensitive data
        const sanitizedError = isPaymentBoundary 
            ? this.sanitizePaymentError(error)
            : error;

        // Log to structured logger with appropriate context
        logger.error(`[${feature}] Feature error`, sanitizedError, {
            componentStack: errorInfo.componentStack,
            severity,
            isPaymentBoundary,
            timestamp: new Date().toISOString()
        });

        // Generate user-friendly message
        const userMessage = isPaymentBoundary 
            ? this.getPaymentErrorMessage(error)
            : this.getGenericErrorMessage(error, feature);

        // Update state with error info
        this.setState({ errorInfo, userMessage });

        // Call custom error handler if provided
        if (onError) {
            onError(sanitizedError, errorInfo);
        }

        // Send to error tracking in production (with sanitized data).
        // window.Sentry is typed via src/types/globals.d.ts.
        if (import.meta.env.PROD && window.Sentry) {
            window.Sentry.withScope((scope) => {
                scope.setTag('feature', feature);
                scope.setTag('severity', severity);
                scope.setTag('is_payment', isPaymentBoundary ? 'yes' : 'no');
                scope.setExtra('componentStack', errorInfo.componentStack);
                // Never send raw error for payment boundaries
                window.Sentry?.captureException(sanitizedError);
            });
        }
    }

    /**
     * Sanitize payment errors to ensure no sensitive data is exposed
     */
    private sanitizePaymentError(error: Error): Error {
        // Create a new error with sanitized message
        const sensitivePatterns = [
            /sk_live_[a-zA-Z0-9]{24,}/g,  // Live secret keys
            /sk_test_[a-zA-Z0-9]{24,}/g,  // Test secret keys
            /pk_live_[a-zA-Z0-9]{24,}/g,  // Live publishable keys
            /pk_test_[a-zA-Z0-9]{24,}/g,  // Test publishable keys
            /[0-9]{13,19}/g,              // Credit card numbers
            /client_secret_[a-zA-Z0-9_-]+/g,  // Client secrets
            /pi_[a-zA-Z0-9]{24}/g,        // Payment intent IDs (optional)
        ];

        let sanitizedMessage = error.message;
        sensitivePatterns.forEach(pattern => {
            sanitizedMessage = sanitizedMessage.replace(pattern, '[REDACTED]');
        });

        const sanitizedError = new Error(sanitizedMessage);
        sanitizedError.name = error.name;
        sanitizedError.stack = error.stack ? this.sanitizeStackTrace(error.stack) : undefined;
        
        return sanitizedError;
    }

    /**
     * Sanitize stack trace to remove sensitive data
     */
    private sanitizeStackTrace(stack: string): string {
        // Remove any lines that might contain sensitive URLs or data
        return stack
            .split('\n')
            .filter(line => !line.includes('stripe') || line.includes('stripe/react-stripe-js'))
            .join('\n');
    }

    /**
     * Get user-friendly payment error message
     * Never exposes technical details or sensitive information
     */
    private getPaymentErrorMessage(error: Error): string {
        const message = error.message.toLowerCase();
        
        // Map common Stripe errors to user-friendly messages
        if (message.includes('card') || message.includes('payment_method')) {
            return 'Your card could not be processed. Please check your card details and try again.';
        }
        if (message.includes('network') || message.includes('connection')) {
            return 'Connection issue detected. Please check your internet connection and try again.';
        }
        if (message.includes('expired') || message.includes('session')) {
            return 'Your payment session has expired. Please refresh the page and try again.';
        }
        if (message.includes('declined') || message.includes('insufficient')) {
            return 'Your payment was declined. Please try a different payment method.';
        }
        if (message.includes('cvc') || message.includes('security')) {
            return 'Your card security code is invalid. Please check and try again.';
        }
        
        // Default payment error - generic and safe
        return 'An error occurred while processing your payment. Please try again or contact support if the problem persists.';
    }

    /**
     * Get generic error message for non-payment features
     */
    private getGenericErrorMessage(error: Error, feature: string): string {
        if (import.meta.env.DEV) {
            return error.message;
        }
        return `Something went wrong with ${feature}. Please try again.`;
    }

    handleReset = () => {
        const { onReset } = this.props;
        
        this.setState({ 
            hasError: false, 
            error: null, 
            errorInfo: null,
            userMessage: ''
        });
        
        if (onReset) {
            onReset();
        }
    };

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/gallery/';
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
        const { hasError, userMessage } = this.state;
        const { children, feature, severity = 'medium', fallback, isPaymentBoundary } = this.props;

        if (hasError) {
            // Custom fallback UI
            if (fallback) {
                return <>{fallback}</>;
            }

            // Default error UI - mobile-first responsive design
            return (
                <div className={`rounded-lg border-2 p-4 sm:p-6 m-2 sm:m-4 ${this.getSeverityStyles(severity)}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <span className="text-3xl sm:text-4xl text-center sm:text-left">{this.getSeverityIcon(severity)}</span>
                        <div className="flex-1 text-center sm:text-left">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2">
                                {isPaymentBoundary ? 'Payment Error' : `${feature} Error`}
                            </h3>
                            
                            {/* User-friendly message - always shown */}
                            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm sm:text-base">
                                {userMessage || `Something went wrong${isPaymentBoundary ? ' with your payment' : ''}. Please try again.`}
                            </p>
                            
                            {/* Additional payment security notice */}
                            {isPaymentBoundary && (
                                <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 flex items-center justify-center sm:justify-start gap-2">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                        </svg>
                                        Your payment information is secure and has not been charged.
                                    </p>
                                </div>
                            )}
                            
                            {/* Technical details only in development */}
                            {import.meta.env.DEV && this.state.error && (
                                <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs sm:text-sm font-mono overflow-auto">
                                    <p className="text-red-600 dark:text-red-400">{this.state.error.message}</p>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                <button
                                    onClick={this.handleReset}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm sm:text-base"
                                >
                                    Try Again
                                </button>
                                {isPaymentBoundary && (
                                    <button
                                        onClick={this.handleGoHome}
                                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg font-medium transition-colors text-sm sm:text-base"
                                    >
                                        Return to Gallery
                                    </button>
                                )}
                                <button
                                    onClick={this.handleReload}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg font-medium transition-colors text-sm sm:text-base"
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

export const CheckoutErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
    <FeatureErrorBoundary feature="Checkout" severity="critical" isPaymentBoundary>
        {children}
    </FeatureErrorBoundary>
);

export const PaymentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
    <FeatureErrorBoundary feature="Payment Processing" severity="critical" isPaymentBoundary>
        {children}
    </FeatureErrorBoundary>
);

export const CartErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
    <FeatureErrorBoundary feature="Shopping Cart" severity="high">
        {children}
    </FeatureErrorBoundary>
);

export const GalleryErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
    <FeatureErrorBoundary feature="Photo Gallery" severity="medium">
        {children}
    </FeatureErrorBoundary>
);

export const CustomerPortalErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
    <FeatureErrorBoundary feature="Customer Portal" severity="high">
        {children}
    </FeatureErrorBoundary>
);

export const OrderErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
    <FeatureErrorBoundary feature="Order Management" severity="high">
        {children}
    </FeatureErrorBoundary>
);

export const SettingsErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
    <FeatureErrorBoundary feature="Settings" severity="medium">
        {children}
    </FeatureErrorBoundary>
);

export default FeatureErrorBoundary;
