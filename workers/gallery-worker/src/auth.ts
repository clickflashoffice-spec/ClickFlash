import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hash a plain text password.
 * @param {string} password - Plain text password.
 * @returns {Promise<string>} - Hashed password.
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
        console.error('[Auth] Password hashing error:', error.message);
        throw error;
    }
}

/**
 * Compare a plain text password with a hashed password.
 * @param {string} password - Plain text password.
 * @param {string} hash - Hashed password from DB.
 * @returns {Promise<boolean>} - True if match.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
    }
    if (!hash || typeof hash !== 'string') {
        throw new Error('Hash must be a non-empty string');
    }

    try {
        return await bcrypt.compare(password, hash);
    } catch (error: any) {
        console.error('[Auth] Password verification error:', error.message);
        throw error;
    }
}
