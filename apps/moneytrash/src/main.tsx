import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initTauriApi } from './services/tauriService'
import { FeatureErrorBoundary } from './components/error-boundaries/FeatureErrorBoundary'

const initTauri = async () => {
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    try {
      await initTauriApi();
      console.log('[MoneyTrash] Tauri API initialized successfully');
    } catch (e) {
      console.warn('[MoneyTrash] Tauri API initialization deferred:', e);
    }
  }
};

initTauri().catch(console.error);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FeatureErrorBoundary featureName="MoneyTrash App" showReset>
      <App />
    </FeatureErrorBoundary>
  </React.StrictMode>,
)
