import { logger } from '@clickflash/logger';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initDesktopApi, isDesktop } from './services/tauriService'
import { FeatureErrorBoundary } from './components/error-boundaries/FeatureErrorBoundary'

const initializeDesktopRuntime = async () => {
  if (isDesktop()) {
    try {
      await initDesktopApi();
      logger.info('[MoneyTrash] Desktop API initialized successfully');
    } catch (e) {
      logger.warn('[MoneyTrash] Desktop API initialization deferred:', e);
    }
  }
};

initializeDesktopRuntime().catch(error => (
  logger.error('[MoneyTrash] Desktop initialization failed:', error instanceof Error ? error : new Error(String(error)))
));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FeatureErrorBoundary featureName="MoneyTrash App" showReset>
      <App />
    </FeatureErrorBoundary>
  </React.StrictMode>,
)
