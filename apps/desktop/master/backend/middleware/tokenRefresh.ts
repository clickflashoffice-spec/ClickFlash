// backend/shared/tokenRefresh.ts
import crypto from 'crypto';
import type { DatabaseManager } from '../database/db';
import type AuditLogger from '../utils/auditLogger';

interface RefreshTokenData {
    userId: string | number;
    createdAt: number;
    expiresAt: number;
    used: boolean;
}

const refreshTokens = new Map<string, RefreshTokenData>();

setInterval(() => {
    const now = Date.now();
    for (const [token, data] of refreshTokens.entries()) {
        if (data.expiresAt < now) refreshTokens.delete(token);
    }
}, 60 * 60 * 1000);

export function generateRefreshToken(userId: string | number, expiresInDays: number = 7): string {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + (expiresInDays * 24 * 60 * 60 * 1000);
    refreshTokens.set(token, { userId, createdAt: now, expiresAt, used: false });
    return token;
}

export function validateAndConsumeRefreshToken(token: string): { userId: string | number, createdAt: number } | null {
    if (!token) return null;
    const tokenData = refreshTokens.get(token);
    if (!tokenData) return null;
    if (Date.now() > tokenData.expiresAt) {
        refreshTokens.delete(token);
        return null;
    }
    if (tokenData.used) {
        revokeUserRefreshTokens(tokenData.userId);
        return null;
    }
    tokenData.used = true;
    return { userId: tokenData.userId, createdAt: tokenData.createdAt };
}

export function revokeRefreshToken(token: string): void {
    if (token) refreshTokens.delete(token);
}

export function revokeUserRefreshTokens(userId: string | number): void {
    for (const [token, data] of refreshTokens.entries()) {
        if (data.userId === userId) refreshTokens.delete(token);
    }
}

/**
 * Service wrapper around the module-level token refresh functions.
 * Accepts dbManager and auditLogger for future DB-backed persistence.
 */
export class TokenRefreshService {
    // Reserved for future DB-backed persistence migration
    constructor(
        _dbManager: DatabaseManager,
        _auditLogger: AuditLogger
    ) {}

    generate(userId: string | number, expiresInDays?: number): string {
        return generateRefreshToken(userId, expiresInDays);
    }

    validateAndConsume(token: string) {
        return validateAndConsumeRefreshToken(token);
    }

    revoke(token: string): void {
        revokeRefreshToken(token);
    }

    revokeAllForUser(userId: string | number): void {
        revokeUserRefreshTokens(userId);
    }
}
