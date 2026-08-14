/**
 * Timing constants for the application
 * Centralized timeout and interval values for better maintainability
 */

export const TIMEOUTS = {
  // Service Worker & Connection
  SERVICE_WORKER_RETRY: 500,
  CONNECTION_RETRY_DELAY: 1000,
  
  // Sync & Polling Intervals
  KIOSK_SYNC_INTERVAL: 30000, // 30 seconds
  HEARTBEAT_INTERVAL: 15000, // 15 seconds
  AUTO_REFRESH_INTERVAL: 60000, // 60 seconds - auto-refresh dashboard data
  
  // User Interface
  IDLE_TIMEOUT: 60000, // 60 seconds - default idle timeout
  AUTO_SAVE_DEBOUNCE: 1000, // 1 second - auto-save debounce
  TOAST_DISPLAY_DURATION: 3000, // 3 seconds - toast notification display
  SAVE_STATUS_DISPLAY: 3000, // 3 seconds - save status message display
  
  // Network & Retry
  API_RETRY_DELAY: 2000, // 2 seconds
  WEBSOCKET_RECONNECT_DELAY: 1000, // 1 second
} as const;

/**
 * Helper function to convert seconds to milliseconds
 */
export const secondsToMs = (seconds: number): number => seconds * 1000;

/**
 * Helper function to convert minutes to milliseconds
 */
export const minutesToMs = (minutes: number): number => minutes * 60 * 1000;

