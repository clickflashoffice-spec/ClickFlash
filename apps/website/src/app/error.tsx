'use client';

import Link from 'next/link';
import { useEffect } from 'react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Route-level error boundary for the Next.js App Router.
 * Catches render/data errors in any route segment and its children.
 * Displays a user-friendly fallback instead of a raw error screen.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to Sentry or other error monitoring in production
    if (process.env.NODE_ENV === 'production') {
      console.error('[Error Boundary]', error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <div className="max-w-md">
        <h1 className="mb-4 text-4xl font-semibold text-slate-900" style={{ fontFamily: 'var(--font-cormorant)' }}>
          Something went wrong
        </h1>
        <p className="mb-8 text-slate-500">
          We encountered an unexpected error. Please try again, or contact us if the problem persists.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-cyan-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-cyan-600"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-lg border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Return home
          </Link>
        </div>
        {process.env.NODE_ENV !== 'production' && (
          <details className="mt-8 rounded-lg border border-red-100 bg-red-50 p-4 text-left">
            <summary className="cursor-pointer text-sm font-medium text-red-700">
              Error details (dev only)
            </summary>
            <pre className="mt-2 overflow-auto text-xs text-red-600">{error.message}</pre>
          </details>
        )}
      </div>
    </div>
  );
}
