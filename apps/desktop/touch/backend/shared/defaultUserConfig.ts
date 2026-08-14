/**
 * Secure Default User Configuration
 * Use environment variables for production
 */

import crypto from 'crypto';
import { Logger } from '../shared/logger';
const logger = new Logger('logs');

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
    const email = process.env.DEFAULT_ADMIN_EMAIL || 'alaeddine@example.com';
    const password = process.env.DEFAULT_ADMIN_PASSWORD;
    
    if (!password) {
        if (isProduction()) {
            throw new Error('FATAL: DEFAULT_ADMIN_PASSWORD environment variable is required in production. Cannot start without secure admin credentials.');
        }
        logger.warn('[Security] DEFAULT_ADMIN_PASSWORD not set. Using auto-generated secure password. This is only acceptable in development.');
        return {
            name: process.env.DEFAULT_ADMIN_NAME || 'Alaeddine',
            email,
            password: generateSecurePassword(),
            role: 'Admin',
            password_must_change: 1
        };
    }
    
    return {
        name: process.env.DEFAULT_ADMIN_NAME || 'Alaeddine',
        email,
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

    if (isProduction() && config.password === 'DevInsecurePassword123!') {
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
        const allowed = process.env.ALLOW_AUTO_CREATE_USER === 'true';
        if (!allowed) {
            logger.warn('[Security] Auto-create user disabled in production. Set ALLOW_AUTO_CREATE_USER=true to enable.');
        }
        return allowed;
    }
    return true;
}
