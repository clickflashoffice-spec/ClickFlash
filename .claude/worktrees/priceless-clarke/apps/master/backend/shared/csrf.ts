// backend/shared/csrf.ts
import crypto from 'crypto';
import type { DatabaseManager } from './db';

interface CsrfTokenData {
    userId: string | number | null;
    createdAt: number;
    expiresAt: number;
}

// ── In-memory store (fallback / always used as L1 cache) ────────────────────
const csrfTokens = new Map<string, CsrfTokenData>();

// ── SQLite store (L2 persistence — survives server restarts) ────────────────
let db: DatabaseManager | null = null;
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Initialise the SQLite-backed CSRF store.
 * Call this once from server.ts after the database is ready.
 *
 * On startup, unexpired tokens are loaded from the DB into the in-memory cache
 * so that requests already in-flight when the server restarts continue to work.
 */
export function initCsrfStore(database: DatabaseManager): void {
    db = database;

    // Create the table if it doesn't exist yet. (Also handled via migration 061)
    db.exec(`
        CREATE TABLE IF NOT EXISTS csrf_tokens (
            token      TEXT PRIMARY KEY,
            user_id    TEXT,
            created_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL
        )
    `);

    // Prune expired rows left over from previous runs.
    db.run('DELETE FROM csrf_tokens WHERE expires_at < ?', [Date.now()]);

    // Warm the in-memory cache with surviving tokens.
    const rows = db.query<{ token: string; user_id: string | null; created_at: number; expires_at: number }>(
        'SELECT token, user_id, created_at, expires_at FROM csrf_tokens'
    );
    for (const row of rows) {
        csrfTokens.set(row.token, {
            userId: row.user_id,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
        });
    }

    console.info(`[CSRF] SQLite store initialised — ${rows.length} token(s) restored from disk.`);
    
    // ── Hourly cleanup: removes expired entries from both stores ─────────────────
    if (!cleanupInterval) {
        cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [token, data] of csrfTokens.entries()) {
                if (data.expiresAt < now) {
                    csrfTokens.delete(token);
                }
            }
            // Mirror cleanup in SQLite (fire-and-forget — non-critical)
            if (db) {
                try { db.run('DELETE FROM csrf_tokens WHERE expires_at < ?', [now]); } catch { /* ignore */ }
            }
        }, 60 * 60 * 1000);
    }
}

// Alias for compatibility
export const initCsrfTokenStore = initCsrfStore;

// ── Public API ───────────────────────────────────────────────────────────────

export function generateToken(userId: string | number | null = null): string {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + (24 * 60 * 60 * 1000); // 24 h

    const data: CsrfTokenData = { userId, createdAt: now, expiresAt };
    csrfTokens.set(token, data);

    // Persist to SQLite if the store is initialised.
    if (db) {
        try {
            db.run(
                'INSERT OR REPLACE INTO csrf_tokens (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
                [token, userId !== null ? String(userId) : null, now, expiresAt],
            );
        } catch (err) {
            // Non-fatal — the in-memory entry is still valid.
            console.warn('[CSRF] Failed to persist token to SQLite:', err);
        }
    }

    return token;
}

export function validateToken(token: string, userId: string | number | null = null): boolean {
    if (!token) return false;

    const tokenData = csrfTokens.get(token);
    if (!tokenData) return false;

    if (Date.now() > tokenData.expiresAt) {
        csrfTokens.delete(token);
        if (db) {
            try { db.run('DELETE FROM csrf_tokens WHERE token = ?', [token]); } catch { /* ignore */ }
        }
        return false;
    }

    if (userId && tokenData.userId && tokenData.userId !== String(userId)) return false;

    return true;
}

export function revokeToken(token: string): void {
    if (!token) return;
    csrfTokens.delete(token);
    if (db) {
        try { db.run('DELETE FROM csrf_tokens WHERE token = ?', [token]); } catch { /* ignore */ }
    }
}

export function revokeUserTokens(userId: string | number): void {
    for (const [token, data] of csrfTokens.entries()) {
        if (data.userId === String(userId)) csrfTokens.delete(token);
    }
    if (db) {
        try { db.run('DELETE FROM csrf_tokens WHERE user_id = ?', [String(userId)]); } catch { /* ignore */ }
    }
}

export function getTokenExpiration(token: string): number | null {
    const tokenData = csrfTokens.get(token);
    return tokenData ? tokenData.expiresAt : null;
}

export function closeCsrfTokenStore(): void {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }
    db = null;
}