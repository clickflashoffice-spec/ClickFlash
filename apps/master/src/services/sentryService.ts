/**
 * Sentry Error Tracking Service
 * 
 * Provides centralized error tracking integration with Sentry.
 * Handles initialization, error reporting, and user context.
 */

import * as Sentry from '@sentry/react';
import { networkManager } from "./networkManager";
import { useConnectionStore } from "../store/connectionStore";

// Helper function to check if we're in development mode (Jest-compatible)
const isDev = (): boolean => {
    if (typeof jest !== 'undefined') return true;
    try {
        return (globalThis as { import?: { meta?: { env?: { DEV?: boolean } } } }).import?.meta?.env?.DEV || false;
    } catch {
        return false;
    }
};
const isProd = (): boolean => {
    if (typeof jest !== 'undefined') return false;
    try {
        return (globalThis as { import?: { meta?: { env?: { PROD?: boolean } } } }).import?.meta?.env?.PROD || false;
    } catch {
        return false;
    }
};
const getMode = (): string => {
    if (typeof jest !== 'undefined') return 'test';
    try {
        return (globalThis as { import?: { meta?: { env?: { MODE?: string } } } }).import?.meta?.env?.MODE || 'development';
    } catch {
        return 'development';
    }
};

/**
 * Initialize Sentry for error tracking
 * @param dsn - Sentry DSN (Data Source Name) from environment or config
 * @param environment - Environment name (development, production, etc.)
 * @param release - Application release version
 */
export function initSentry(dsn?: string, environment?: string, release?: string): void {
    // Only initialize if DSN is provided
    if (!dsn) {
        if (isDev()) {
            console.warn('[Sentry] DSN not provided, error tracking disabled');
        }
        return;
    }

    try {
        Sentry.init({
            dsn,
            environment: environment || getMode(),
            release: release || 'master-portal@4.1.0',

            // Performance monitoring
            tracesSampleRate: isProd() ? 0.1 : 1.0, // 10% in prod, 100% in dev

            // Session replay (optional, can be expensive)
            replaysSessionSampleRate: isProd() ? 0.1 : 1.0,
            replaysOnErrorSampleRate: 1.0,

            // Filter out known non-critical errors
            ignoreErrors: [
                // Browser extension errors
                'ResizeObserver loop limit exceeded',
                'Non-Error promise rejection captured',
                // Network errors that are handled gracefully
                'NetworkError',
                'Failed to fetch',
                // Known harmless warnings
                'Could not override window.ethereum',
            ],

            // Filter out URLs that shouldn't be tracked
            denyUrls: [
                // Browser extensions
                /extensions\//i,
                /^chrome:\/\//i,
                /^moz-extension:\/\//i,
            ],

            // Additional context
            beforeSend(event, _hint) {
                // Don't send errors in development unless explicitly enabled
                const isDevEnv = isDev();
                if (isDevEnv && !process.env.VITE_SENTRY_ENABLED) {
                    return null;
                }

                // Add custom tags for network and real-time status
                const netState = networkManager.getState();
                const connState = useConnectionStore.getState();

                event.tags = {
                    ...event.tags,
                    component: 'master-portal',
                    network_quality: netState.quality,
                    network_online: String(netState.isOnline),
                    realtime_status: connState.status,
                };

                event.contexts = {
                    ...event.contexts,
                    network: {
                        latency: netState.latency,
                        last_checked: netState.lastChecked,
                    },
                    realtime: {
                        status: connState.status,
                        error_count: connState.errorCount,
                        last_heartbeat: connState.lastHeartbeat,
                    }
                };

                return event;
            },

            // Integrate with React Router
            integrations: [
                Sentry.browserTracingIntegration(),
                Sentry.replayIntegration({
                    maskAllText: true,
                    blockAllMedia: true,
                }),
            ],
        });

        if (isDev()) {
            console.log('[Sentry] Error tracking initialized');
        }
    } catch (error) {
        console.error('[Sentry] Failed to initialize', error);
    }
}

/**
 * Set user context for error tracking
 * @param user - User object with id, email, etc.
 */
export function setSentryUser(user: { id?: string; email?: string; role?: string } | null): void {
    if (!user) {
        Sentry.setUser(null);
        return;
    }

    Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.email,
        role: user.role,
    });
}

/**
 * Capture an exception
 * @param error - Error object
 * @param context - Additional context
 */
export function captureException(error: Error, context?: Record<string, any>): void {
    if (context) {
        Sentry.withScope((scope) => {
            Object.keys(context).forEach(key => {
                scope.setContext(key, context[key]);
            });
            Sentry.captureException(error);
        });
    } else {
        Sentry.captureException(error);
    }
}

/**
 * Capture a message
 * @param message - Message to capture
 * @param level - Severity level
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
    Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 * @param message - Breadcrumb message
 * @param category - Breadcrumb category
 * @param level - Severity level
 * @param data - Additional data
 */
export function addBreadcrumb(
    message: string,
    category?: string,
    level: Sentry.SeverityLevel = 'info',
    data?: Record<string, any>
): void {
    Sentry.addBreadcrumb({
        message,
        category: category || 'default',
        level,
        data,
        timestamp: Date.now() / 1000,
    });
}

/**
 * Set additional context
 * @param key - Context key
 * @param context - Context data
 */
export function setContext(key: string, context: Record<string, any>): void {
    Sentry.setContext(key, context);
}

/**
 * Set tag for filtering
 * @param key - Tag key
 * @param value - Tag value
 */
export function setTag(key: string, value: string): void {
    Sentry.setTag(key, value);
}

/**
 * Wrap a function with error tracking
 * @param fn - Function to wrap
 * @param context - Context name
 */
export function withErrorTracking<T extends (...args: unknown[]) => unknown>(
    fn: T,
    context: string
): T {
    return ((...args: unknown[]) => {
        try {
            return fn(...args);
        } catch (error) {
            captureException(error instanceof Error ? error : new Error(String(error)), {
                function: context,
                arguments: args,
            });
            throw error;
        }
    }) as T;
}

/**
 * Wrap an async function with error tracking
 * @param fn - Async function to wrap
 * @param context - Context name
 */
export function withAsyncErrorTracking<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    context: string
): T {
    return ((...args: unknown[]) => {
        return fn(...args).catch((error) => {
            captureException(error instanceof Error ? error : new Error(String(error)), {
                function: context,
                arguments: args,
            });
            throw error;
        });
    }) as T;
}

