/**
 * Kiosk Configuration
 * 
 * Centralized configuration for kiosk-specific settings.
 * Values are loaded from environment variables with sensible defaults.
 */

export const kioskConfig = {
    /**
     * Auto-login credentials for kiosk offline recovery
     * Used when the kiosk loses authentication and needs to re-login
     * without user intervention
     */
    autoLogin: {
        email: import.meta.env.VITE_KIOSK_AUTO_LOGIN_EMAIL || '',
        password: import.meta.env.VITE_KIOSK_AUTO_LOGIN_PASSWORD || '',
        enabled: !!(import.meta.env.VITE_KIOSK_AUTO_LOGIN_EMAIL && import.meta.env.VITE_KIOSK_AUTO_LOGIN_PASSWORD)
    },

    /**
     * Sync configuration
     */
    sync: {
        intervalMs: parseInt(import.meta.env.VITE_SYNC_INTERVAL || '30000'),
        enabled: import.meta.env.VITE_ENABLE_SYNC !== 'false',
        maxRetries: 3,
        retryDelayMs: 1000
    },

    /**
     * Offline mode configuration
     */
    offline: {
        enabled: import.meta.env.VITE_ENABLE_OFFLINE_MODE !== 'false',
        maxQueueSize: 100, // Maximum items in offline queue
        storageQuotaWarningPercent: 80 // Warn when storage is 80% full
    },

    /**
     * Feature flags
     */
    features: {
        debug: import.meta.env.VITE_DEBUG_MODE === 'true',
        analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true'
    }
} as const;

/**
 * Validate kiosk configuration
 * Returns array of validation errors, empty if valid
 */
export function validateKioskConfig(): string[] {
    const errors: string[] = [];

    if (!kioskConfig.autoLogin.enabled) {
        errors.push('Kiosk auto-login not configured. Set VITE_KIOSK_AUTO_LOGIN_EMAIL and VITE_KIOSK_AUTO_LOGIN_PASSWORD');
    }

    if (kioskConfig.sync.intervalMs < 5000) {
        errors.push('Sync interval too short (minimum 5000ms)');
    }

    return errors;
}
