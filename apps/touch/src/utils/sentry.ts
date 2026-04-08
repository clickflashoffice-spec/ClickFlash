// @ts-ignore — @sentry/react is optional; install if error monitoring is needed
let Sentry: any = null;
try { Sentry = require('@sentry/react'); } catch { /* not installed */ }

export function initSentry() {
  if (!Sentry || import.meta.env.DEV || !import.meta.env.VITE_SENTRY_DSN) return;
  try {
    // @ts-ignore
    const { BrowserTracing } = require('@sentry/tracing');
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'production',
      integrations: [new BrowserTracing()],
      tracesSampleRate: 0.1,
    });
  } catch { /* Sentry not available */ }
}

export const SentryErrorBoundary: React.ComponentType<any> = Sentry?.ErrorBoundary ?? (({ children }: any) => children);
