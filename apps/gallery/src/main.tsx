import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './components/ThemeContext';
import { CurrencyProvider } from './components/CurrencyContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';

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

// Suppress harmless browser extension warnings (e.g., wallet extensions competing for window.ethereum)
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  // Filter out wallet extension warnings that don't affect functionality
  if (message.includes("couldn't override `window.ethereum`") ||
    message.includes("Backpack couldn't override")) {
    return; // Suppress this specific warning
  }
  originalWarn.apply(console, args);
};

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
