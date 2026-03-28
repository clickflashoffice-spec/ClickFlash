/**
 * Empty preload fallback when main preload fails to load
 */

console.warn('[Preload] Using empty preload - limited functionality available');

// Expose minimal API
contextBridge.exposeInMainWorld('electronAPI', {
  window: {
    minimize: () => {},
    maximize: () => {},
    close: () => {},
    setFullscreen: () => {},
    isFullscreen: () => Promise.resolve(false),
  },
  kiosk: {
    unlock: () => Promise.resolve({ success: false, error: 'Preload not loaded' }),
    lock: () => Promise.resolve({ success: false }),
    getStatus: () => Promise.resolve({ isLocked: false }),
  },
  dialog: {
    openDirectory: () => Promise.resolve(null),
    openFile: () => Promise.resolve(null),
    saveFile: () => Promise.resolve(null),
  },
  updater: {
    check: () => Promise.resolve({}),
    download: () => Promise.resolve({}),
    install: () => Promise.resolve(),
    getStatus: () => Promise.resolve({}),
    onEvent: () => {},
    removeListener: () => {},
  },
  backend: {
    restart: () => Promise.resolve({ success: false }),
    getStatus: () => Promise.resolve({ status: 'unknown' }),
    healthCheck: () => Promise.resolve({ healthy: false, latencyMs: 0 }),
  },
  invoke: () => Promise.reject(new Error('Preload not loaded')),
  log: (level, message, meta) => {
    console.log(`[Renderer] ${message}`, meta);
  },
});
