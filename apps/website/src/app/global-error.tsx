'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Global error boundary for the Next.js App Router.
 * Wraps the entire root layout — used as a last resort when the root layout itself throws.
 * Must include its own <html> and <body> tags since it replaces the root layout.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Global Error Boundary]', error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', backgroundColor: '#fff' }}>
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '2rem', fontWeight: 600, color: '#0f172a', marginBottom: '1rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#64748b', marginBottom: '2rem', maxWidth: '28rem' }}>
            A critical error occurred. Please refresh the page or return to the homepage.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                backgroundColor: '#06b6d4',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                border: '1px solid #e2e8f0',
                color: '#334155',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Return home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
