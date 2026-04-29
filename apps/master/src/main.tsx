import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./components/ThemeContext";
import { CurrencyProvider } from "./components/CurrencyContext";
import GlobalErrorBoundary from "./components/common/GlobalErrorBoundary";
import { logger } from "./utils/logger";
import { initSentry } from "./services/sentryService";
import { safeStorage } from "./utils/safeStorage";
import "./index.css";

// Initialize Sentry error tracking — release version injected by Vite from package.json
initSentry(
  import.meta.env.VITE_SENTRY_DSN,
  import.meta.env.MODE,
  `master-portal@${import.meta.env.VITE_APP_VERSION ?? "unknown"}`,
);

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

// Global error handler for dynamic import failures (common after deployment/rebuilds)
// This automatically reloads the page if a chunk is missing (404/403)
window.addEventListener("error", (event) => {
  const isChunkError =
    event.message?.includes("Failed to fetch dynamically imported module") ||
    event.message?.includes("Importing a module script failed");

  if (isChunkError) {
    console.error("Dynamic chunk missing, forcing reload...", event.error);
    // Prevent infinite reload loops with a session storage flag
    const now = Date.now();
    const lastReload = parseInt(
      sessionStorage.getItem("chunk_reload_ts") || "0",
      10,
    );

    // Only reload if we haven't reloaded recently (e.g., within 10 seconds)
    if (now - lastReload > 10000) {
      sessionStorage.setItem("chunk_reload_ts", now.toString());
      window.location.reload();
    }
  }
});

// Create a QueryClient instance for React Query with cache persistence
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes - keep data in cache longer (formerly cacheTime)
      // Enable cache persistence
      refetchOnMount: false, // Don't refetch if data is fresh
      refetchOnReconnect: true, // Refetch when reconnecting
    },
  },
});

const CACHE_KEY = "MASTER_PORTAL_QUERY_CACHE";

// Cache persistence disabled: causes QuotaExceededError with large photo datasets.
// The local Express backend is fast enough that re-fetching on mount is preferred.
// This block clears any legacy cache entries left from previous versions.
try {
  if (safeStorage.getItem(CACHE_KEY)) {
    logger.info(
      "[Cache] Clearing legacy LocalStorage query cache to free up quota.",
    );
    safeStorage.removeItem(CACHE_KEY);
  }
} catch (e) {
  // Ignore
}

// Log that main.tsx is loading
if (import.meta.env.DEV) {
  logger.debug("[main.tsx] Starting application...");
}

// Set mode for master portal
if (!window.location.search.includes("mode=")) {
  const url = new URL(window.location.href);
  url.searchParams.set("mode", "master");
  window.history.replaceState({}, "", url.toString());
}

// Check if root element exists
const rootElement = document.getElementById("root");
if (!rootElement) {
  logger.error("[main.tsx] Root element not found!");
  document.body.innerHTML =
    '<div style="padding: 20px; color: red;">ERROR: Root element (#root) not found in HTML</div>';
} else {
  if (import.meta.env.DEV) {
    logger.debug("[main.tsx] Root element found, creating React root...");
  }

  try {
    const root = ReactDOM.createRoot(rootElement);
    if (import.meta.env.DEV) {
      logger.debug("[main.tsx] React root created, rendering app...");
    }

    root.render(
      <React.StrictMode>
        <GlobalErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <CurrencyProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </CurrencyProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </GlobalErrorBoundary>
      </React.StrictMode>,
    );

    if (import.meta.env.DEV) {
      logger.info("[main.tsx] App rendered successfully");
    }

    // Campaign scheduler moved to backend (Rule 01, 14)
  } catch (error) {
    logger.error(
      "[main.tsx] ERROR rendering app",
      error instanceof Error ? error : new Error(String(error)),
    );
    rootElement.innerHTML = `<div style="padding: 20px; color: red;">ERROR: Failed to render app: ${error instanceof Error ? error.message : String(error)}</div>`;
  }
}
