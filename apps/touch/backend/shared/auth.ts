// backend/shared/auth.ts
import bcrypt from 'bcryptjs';
import { Logger } from '../shared/logger';
const logger = new Logger('logs');

const SALT_ROUNDS = 12;

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
        logger.error('[Auth] Password hashing error:', error.message);
        throw error;
    }
}

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
        logger.error('[Auth] Password verification error:', error.message);
        throw error;
    }
}
