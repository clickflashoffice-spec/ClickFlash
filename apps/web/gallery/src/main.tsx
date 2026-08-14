import { ErrorBoundary } from '@clickflash/ui';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './components/ThemeContext';
import { CurrencyProvider } from './components/CurrencyContext';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import './i18n';

// Gallery QueryClient — customer-facing portal: moderate caching, no
// window-focus refetch (kiosk/tablet users don't background-switch tabs).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,       // 30 s fresh window
      gcTime: 10 * 60 * 1000,     // 10 min inactive cache
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Set mode for customer portal
if (!window.location.search.includes('mode=')) {
  const url = new URL(window.location.href);
  url.searchParams.set('mode', 'customer');
  window.history.replaceState({}, '', url.toString());
}

// Default exit handler
const handleExit = () => {
  window.location.href = '/';
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <CurrencyProvider>
            <App onExit={handleExit} />
          </CurrencyProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/gallery/service-worker.js').catch(() => {
      // Gallery remains online when shell caching is unavailable.
    });
  });
}
