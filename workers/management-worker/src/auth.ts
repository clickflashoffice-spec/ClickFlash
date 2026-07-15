import bcrypt from 'bcryptjs';
import { logger } from "@clickflash/logger";

const SALT_ROUNDS = 12;

/**
 * Hash a plain text password with bcrypt.
 * @param password - Plain text password.
 * @returns Hashed password.
 */
export async function hashPassword(password: string): Promise<string> {
    if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
    }

    try {
        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        if (!hash || !hash.startsWith('$2')) {
            throw new Error('Failed to generate valid bcrypt hash');
        }
        return hash;
    } catch (error: any) {
        logger.error('[Auth] Password hashing error:', { args: [error.message] });
        throw error;
    }
}

/**
 * Verify a password against a stored hash.
 * Supports bcrypt hashes and legacy SHA-256 hex hashes for backward compatibility.
 * @param password - Plain text password.
 * @param hash - Stored hash from the database.
 * @returns True if the password matches.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
    }
    if (!hash || typeof hash !== 'string') {
        throw new Error('Hash must be a non-empty string');
    }

    try {
        // Prefer bcrypt verification for new hashes.
        if (hash.startsWith('$2')) {
            try {
                return await bcrypt.compare(password, hash);
            } catch (compareError: any) {
                // Malformed bcrypt hash or internal compare failure.
                logger.warn('[Auth] bcrypt compare failed:', { args: [compareError.message] });
                return false;
            }
        }

        // Legacy fallback: SHA-256 hex digest (used by older ClickFlash deployments).
        if (/^[a-f0-9]{64}$/i.test(hash)) {
            return await verifyLegacySha256Password(password, hash);
        }

        return false;
    } catch (error: any) {
        logger.error('[Auth] Password verification error:', { args: [error.message] });
        throw error;
    }
}

/**
 * Legacy SHA-256 password verification for existing user accounts.
 * @param password - Plain text password.
 * @param hash - SHA-256 hex hash.
 * @returns True if the recomputed digest matches.
 */
async function verifyLegacySha256Password(password: string, hash: string): Promise<boolean> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const newHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return newHash.toLowerCase() === hash.toLowerCase();
}
