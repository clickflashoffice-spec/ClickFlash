/**
 * Token Refresh Service
 * 
 * Handles automatic token refresh before expiration.
 * Monitors token expiration and refreshes tokens proactively.
 */

import { logger } from '../utils/logger';

const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // Refresh 5 minutes before expiration
let refreshTimer: NodeJS.Timeout | null = null;
let tokenExpiresAt: number | null = null;

/**
 * Start token refresh monitoring
 * @param expiresIn - Token expiration time in seconds
 * @param baseUrl - Base URL for API calls
 */
export function startTokenRefresh(expiresIn: number, baseUrl: string): void {
    // Clear existing timer
    if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
    }

    // Calculate expiration time
    tokenExpiresAt = Date.now() + (expiresIn * 1000);

    // Calculate refresh time (5 minutes before expiration)
    const refreshTime = (expiresIn - 300) * 1000; // Subtract 5 minutes (300 seconds)

    if (refreshTime <= 0) {
        // Token expires too soon, refresh immediately
        refreshToken(baseUrl).catch(err => {
            logger.error('Failed to refresh token immediately', err);
        });
        return;
    }

    // Schedule refresh
    refreshTimer = setTimeout(() => {
        refreshToken(baseUrl).catch(err => {
            logger.error('Scheduled token refresh failed', err);
        });
    }, refreshTime);

    if (import.meta.env.DEV) {
        logger.debug('Token refresh scheduled', {
            expiresIn,
            refreshTime,
            refreshAt: new Date(Date.now() + refreshTime).toISOString()
        });
    }
}

/**
 * Stop token refresh monitoring
 */
export function stopTokenRefresh(): void {
    if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
    }
    tokenExpiresAt = null;
}

/**
 * Refresh the access token using refresh token
 * @param baseUrl - Base URL for API calls
 * @returns Promise<boolean> - True if refresh successful
 */
export async function refreshToken(baseUrl: string): Promise<boolean> {
    try {
        const response = await fetch(`${baseUrl}/api/auth/refresh`, {
            method: 'POST',
            credentials: 'include' // Include cookies (refresh token)
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Refresh token invalid/expired - user needs to log in again
                logger.warn('Token refresh failed - refresh token invalid');
                stopTokenRefresh();
                // Trigger logout or redirect to login
                window.dispatchEvent(new CustomEvent('auth:refresh-failed'));
                return false;
            }
            throw new Error(`Token refresh failed: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success && data.expiresIn) {
            // Update CSRF token if provided
            if (data.csrfToken) {
                // CSRF token is in httpOnly cookie, but we can update our reference
                // The cookie is automatically updated by the server
            }

            // Restart refresh monitoring with new expiration
            startTokenRefresh(data.expiresIn, baseUrl);

            if (import.meta.env.DEV) {
                logger.debug('Token refreshed successfully', {
                    expiresIn: data.expiresIn
                });
            }

            return true;
        }

        return false;
    } catch (error) {
        logger.error('Token refresh error', error instanceof Error ? error : new Error(String(error)));
        return false;
    }
}

/**
 * Check if token is expired or about to expire
 * @returns boolean - True if token needs refresh
 */
export function isTokenExpiring(): boolean {
    if (!tokenExpiresAt) {
        return false;
    }
    const timeUntilExpiry = tokenExpiresAt - Date.now();
    return timeUntilExpiry <= TOKEN_REFRESH_BUFFER;
}

/**
 * Get time until token expiration
 * @returns number - Milliseconds until expiration, or null if not set
 */
export function getTimeUntilExpiration(): number | null {
    if (!tokenExpiresAt) {
        return null;
    }
    return Math.max(0, tokenExpiresAt - Date.now());
}

