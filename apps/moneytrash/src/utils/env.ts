/**
 * Environment configuration utility for MoneyTrash
 * Centralizes access to environment variables and provides defaults.
 */

// Core API endpoints
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://moneytrash-api.clickflash-office.workers.dev';

// Feature flags
export const ENABLE_ANALYTICS = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';
export const WATERMARK_ENABLED = import.meta.env.VITE_WATERMARK_ENABLED !== 'false'; // Default to true
export const WATERMARK_TEXT = import.meta.env.VITE_WATERMARK_TEXT || 'ClickFlash';

export const env = {
  API_BASE_URL,
  ENABLE_ANALYTICS,
  WATERMARK_ENABLED,
  WATERMARK_TEXT,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};
