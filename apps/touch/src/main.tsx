import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './components/ThemeContext';
import { CurrencyProvider } from './components/CurrencyContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import './index.css';

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

// Set mode for touch portal
if (!window.location.search.includes('mode=')) {
  const url = new URL(window.location.href);
  url.searchParams.set('mode', 'touch');
  window.history.replaceState({}, '', url.toString());
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <CurrencyProvider>
          <App
            isOnline={navigator.onLine}
            showToast={(msg) => console.debug('Toast:', msg)}
            onExit={async () => {
              if (window.electron?.exitKiosk) {
                await window.electron.exitKiosk();
              } else {
                console.warn('Exit Kiosk not available');
              }
            }}

          />
        </CurrencyProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
