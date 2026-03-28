/**
 * Constants for Phase 71 Electron Rebuild
 * Process limits, timeouts, and configuration
 */

// Process memory limits (in MB)
export const MEMORY_LIMITS = {
  MAIN_PROCESS: 1024,      // 1GB - Window management only
  BACKEND_PROCESS: 8192,   // 8GB - Express server
  PHOTO_WORKER: 2048,      // 2GB per worker - Image processing
  ML_WORKER: 4096,         // 4GB per worker - Face recognition/ML
  RENDERER: 512,           // 512MB - UI only
} as const;

// Worker pool configuration
export const WORKER_POOL = {
  PHOTO_WORKERS: 4,        // Number of photo processing workers
  ML_WORKERS: 2,           // Number of ML workers
  THUMBNAIL_WORKERS: 4,    // Number of thumbnail workers
  MAX_QUEUE_SIZE: 100,     // Max tasks in queue before rejecting
  TASK_TIMEOUT_MS: 30000,  // 30 seconds per task
  WORKER_IDLE_TIMEOUT_MS: 60000, // Shutdown idle workers after 60s
} as const;

// Health check configuration
export const HEALTH_CHECK = {
  INTERVAL_MS: 5000,       // Check every 5 seconds
  UNRESPONSIVE_THRESHOLD_MS: 30000, // Mark as unresponsive after 30s
  MAX_RETRIES: 3,          // Retry health check 3 times
  BACKEND_PORT: 8090,      // Backend server port
} as const;

// Auto-recovery configuration
export const RECOVERY = {
  BACKEND_RESTART_DELAY_MS: 5000,   // Wait 5s before restarting backend
  WORKER_RESTART_DELAY_MS: 1000,    // Wait 1s before restarting worker
  RENDERER_RELOAD_DELAY_MS: 2000,   // Wait 2s before reloading renderer
  MAX_RESTART_ATTEMPTS: 5,          // Max restart attempts before giving up
  RESTART_COOLDOWN_MS: 60000,       // Cooldown period after max attempts
} as const;

// Window configuration
export const WINDOW = {
  MIN_WIDTH: 1024,
  MIN_HEIGHT: 768,
  DEFAULT_WIDTH: 1920,
  DEFAULT_HEIGHT: 1080,
  SPLASH_SCREEN_DURATION_MS: 2000,
} as const;

// Kiosk mode configuration
export const KIOSK = {
  ADMIN_SHORTCUT: 'CommandOrControl+Alt+Shift+X',
  DEFAULT_PIN: '000000',
  GUARDIAN_PROCESS_NAME: 'KioskGuardian.exe',
} as const;

// IPC configuration
export const IPC = {
  TIMEOUT_MS: 10000,       // 10 second timeout for IPC calls
  MAX_PENDING_REQUESTS: 100, // Max concurrent IPC requests
} as const;

// Logging configuration
export const LOGGING = {
  MAX_FILE_SIZE_MB: 50,
  MAX_FILES: 10,
  LEVEL: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
} as const;

// Security configuration
export const SECURITY = {
  BLOCKED_SHORTCUTS: [
    'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12',
  ] as string[],
  BLOCKED_OS_SHORTCUTS: [
    'Alt+Tab',
    'Alt+F4',
    'Super',
    'Super+D',
    'Super+Tab',
    'Super+L',
    'Super+E',
    'Escape',
  ] as string[],
  ALLOWED_NAVIGATION_HOSTS: ['localhost', '127.0.0.1'] as string[],
};

// Paths
export const PATHS = {
  BACKEND_ENTRY: 'dist/backend/server.js',
  PRELOAD_SCRIPT: 'dist/electron/preload.js',
  // Vite dev server runs on 5173, not 8090 (which is the backend API)
  // In dev, we load from Vite which proxies API requests to backend
  RENDERER_DEV: 'http://localhost:5173',
  RENDERER_PROD: 'dist/master/index.html',
  GUARDIAN: 'KioskGuardian.exe',
} as const;
