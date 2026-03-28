import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

export function initSentry() {
  if (import.meta.env.DEV) return;

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || "production",
    integrations: [new BrowserTracing() as any],
    tracesSampleRate: 0.1,
  });
}

export const SentryErrorBoundary = Sentry.ErrorBoundary;
