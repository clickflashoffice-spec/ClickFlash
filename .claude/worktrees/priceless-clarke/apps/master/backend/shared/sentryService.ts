// backend/shared/sentryService.ts
import { RequestHandler } from 'express';

let Sentry: any = null;
let isInitialized = false;

export async function initSentry(dsn: string, environment: string = 'development', release: string = 'app-backend@4.1.0', component: string = 'backend'): Promise<void> {
    if (!dsn) return;
    try {
        Sentry = await import('@sentry/node');
        Sentry.init({
            dsn,
            environment,
            release,
            tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
            ignoreErrors: ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'],
            beforeSend(event: any) {
                if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_ENABLED) return null;
                event.tags = { ...event.tags, component };
                return event;
            },
            integrations: [new Sentry.Integrations.Http({ tracing: true })],
        });
        isInitialized = true;
    } catch (error) { isInitialized = false; }
}

export function captureException(error: any, context: Record<string, any> = {}): void {
    if (!isInitialized || !Sentry) return;
    try {
        if (Object.keys(context).length > 0) {
            Sentry.withScope((scope: any) => {
                Object.keys(context).forEach((key) => scope.setContext(key, context[key]));
                Sentry.captureException(error);
            });
        } else { Sentry.captureException(error); }
    } catch (err) { 
        console.error('[Sentry] Failed to capture exception:', err instanceof Error ? err.message : String(err));
    }
}

export function captureMessage(message: string, level: string = 'info'): void {
    if (!isInitialized || !Sentry) return;
    try { 
        Sentry.captureMessage(message, level); 
    } catch (err) { 
        console.error('[Sentry] Failed to capture message:', err instanceof Error ? err.message : String(err));
    }
}

export function setUser(user: any): void {
    if (!isInitialized || !Sentry) return;
    try { 
        Sentry.setUser(user ? { id: user.id, email: user.email, username: user.email, role: user.role } : null); 
    } catch (err) { 
        console.error('[Sentry] Failed to set user:', err instanceof Error ? err.message : String(err));
    }
}

export function wrapHandler(handler: Function, context: string): RequestHandler {
    return async (req: any, res: any, next: any) => {
        try {
            if (Sentry && isInitialized) {
                Sentry.setContext('request', { method: req.method, url: req.url, path: req.path, ip: req.socket.remoteAddress });
                if (req.user) setUser(req.user);
            }
            await handler(req, res, next);
        } catch (error) {
            captureException(error, { handler: context, method: req.method, url: req.url });
            throw error;
        }
    };
}

export const getIsInitialized = () => isInitialized;
