/**
 * Secure Default User Configuration
 * Use environment variables for production
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';

export interface DefaultUserConfig {
    name: string;
    email: string;
    password: string;
    role: string;
    password_must_change: number;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * Get default user credentials from environment
 * SECURITY: Throws if DEFAULT_ADMIN_PASSWORD is not set in production
 */
export function getDefaultUserConfig(): DefaultUserConfig {
    const password = process.env.DEFAULT_ADMIN_PASSWORD || generateSecurePassword();
    if (!process.env.DEFAULT_ADMIN_PASSWORD) {
        logger.warn(`[Security] Generated temporary admin password: ${password}`);
        logger.warn('[Security] Set DEFAULT_ADMIN_PASSWORD env var for a persistent password.');
    }
    return {
        name: process.env.DEFAULT_ADMIN_NAME || 'Admin',
        email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@clickflash.local',
        password,
        role: 'Admin',
        password_must_change: 1
    };
}

/**
 * Generate a secure random password
 */
export function generateSecurePassword(): string {
    return crypto.randomBytes(16).toString('base64').slice(0, 22);
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
}

/**
 * Validate default user configuration
 */
export function validateDefaultUserConfig(config: DefaultUserConfig): ValidationResult {
    const errors: string[] = [];

    if (!config.email || !config.email.includes('@')) {
        errors.push('Invalid email address');
    }

    if (!config.password || config.password.length < 8) {
        errors.push('Password must be at least 8 characters');
    }

    if (isProduction() && config.password === 'DEFAULT_PASSWORD_PLACEHOLDER') {
        errors.push('SECURITY WARNING: Default password detected in production!');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Should auto-create default user?
 */
export function shouldAutoCreateUser(): boolean {
    if (isProduction()) {
        return process.env.ALLOW_AUTO_CREATE_USER === 'true';
    }
    return true;
}
