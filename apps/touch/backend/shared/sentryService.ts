// apps/touch/backend/shared/sentryService.ts
import * as Sentry from '@sentry/node';

let isInitialized = false;

/**
 * Initialize Sentry for Touch Backend
 */
export async function initSentry(dsn: string, environment: string = 'development', release: string = 'touch-backend@1.0.0'): Promise<void> {
    if (!dsn) return;
    try {
        Sentry.init({
            dsn,
            environment,
            release,
            tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
            ignoreErrors: ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'],
            beforeSend(event) {
                if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_ENABLED) return null;
                event.tags = { ...event.tags, component: 'touch-backend' };
                return event;
            }
        });
        isInitialized = true;
    } catch (error) {
        isInitialized = false;
        console.error('[Sentry] Failed to initialize:', error instanceof Error ? error.message : String(error));
    }
}

export function captureException(error: any, context: Record<string, any> = {}): void {
    if (!isInitialized) return;
    try {
        if (Object.keys(context).length > 0) {
            Sentry.withScope((scope) => {
                Object.keys(context).forEach((key) => scope.setContext(key, context[key]));
                Sentry.captureException(error);
            });
        } else {
            Sentry.captureException(error);
        }
    } catch (err) {
        console.error('[Sentry] Failed to capture exception:', err instanceof Error ? err.message : String(err));
    }
}

export function captureMessage(message: string, level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info'): void {
    if (!isInitialized) return;
    try {
        Sentry.captureMessage(message, level);
    } catch (err) {
        console.error('[Sentry] Failed to capture message:', err instanceof Error ? err.message : String(err));
    }
}

export function setUser(user: { id?: string | number; email?: string; role?: string } | null): void {
    if (!isInitialized) return;
    try {
        Sentry.setUser(user ? { id: user.id || user.email, email: user.email, role: user.role } : null);
    } catch (err) {
        console.error('[Sentry] Failed to set user:', err instanceof Error ? err.message : String(err));
    }
}

export const getIsInitialized = () => isInitialized;
