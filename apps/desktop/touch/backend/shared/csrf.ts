// backend/shared/csrf.ts
import crypto from 'crypto';

interface CsrfTokenData {
    userId: string | number | null;
    createdAt: number;
    expiresAt: number;
}

const csrfTokens = new Map<string, CsrfTokenData>();

setInterval(() => {
    const now = Date.now();
    for (const [token, data] of csrfTokens.entries()) {
        if (data.expiresAt < now) {
            csrfTokens.delete(token);
        }
    }
}, 60 * 60 * 1000);

export function generateToken(userId: string | number | null = null): string {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + (24 * 60 * 60 * 1000);

    csrfTokens.set(token, { userId, createdAt: now, expiresAt });
    return token;
}

export function validateToken(token: string, userId: string | number | null = null): boolean {
    if (!token) return false;
    const tokenData = csrfTokens.get(token);
    if (!tokenData) return false;
    if (Date.now() > tokenData.expiresAt) {
        csrfTokens.delete(token);
        return false;
    }
    if (userId && tokenData.userId && tokenData.userId !== userId) return false;
    return true;
}

export function revokeToken(token: string): void {
    if (token) csrfTokens.delete(token);
}

export function revokeUserTokens(userId: string | number): void {
    for (const [token, data] of csrfTokens.entries()) {
        if (data.userId === userId) csrfTokens.delete(token);
    }
}

export function getTokenExpiration(token: string): number | null {
    const tokenData = csrfTokens.get(token);
    return tokenData ? tokenData.expiresAt : null;
}
