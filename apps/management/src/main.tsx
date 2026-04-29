import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./components/ThemeContext";
import { CurrencyProvider } from "./components/CurrencyContext";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react";
import "./index.css";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE,
    release: `management@${import.meta.env.VITE_APP_VERSION ?? "unknown"}`,
  });
}

// Suppress harmless browser extension warnings (e.g., wallet extensions competing for window.ethereum)
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const message = args[0]?.toString() || "";
  // Filter out wallet extension warnings that don't affect functionality
  if (
    message.includes("couldn't override `window.ethereum`") ||
    message.includes("Backpack couldn't override")
  ) {
    return; // Suppress this specific warning
  }
  originalWarn.apply(console, args);
};

// Set mode for management portal
if (!window.location.search.includes("mode=")) {
  const url = new URL(window.location.href);
  url.searchParams.set("mode", "management");
  window.history.replaceState({}, "", url.toString());
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 30 s — avoids background-refetch on every
      // component mount for a management dashboard where data changes infrequently.
      staleTime: 30 * 1000,
      // Keep inactive query data in cache for 10 min.
      gcTime: 10 * 60 * 1000,
      // Retry once on transient failure; don't spam a slow backend.
      retry: 1,
      // Do not refetch when the window regains focus — the admin can manually
      // trigger refreshes; background refetches degrade perceived performance.
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <CurrencyProvider>
            <BrowserRouter basename="/manage">
              <App onExit={() => (window.location.href = "/")} />
            </BrowserRouter>
          </CurrencyProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
