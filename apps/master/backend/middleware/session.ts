// backend/middleware/session.ts
// Session middleware configuration using express-session with SQLite store

import session from 'express-session';
import Database from 'better-sqlite3-multiple-ciphers';
import path from 'path';
import { DATA_DIR, SESSION_SECRET } from '../config/constants';
import { logger } from '../utils/logger';

// Require because better-sqlite3-session-store often doesn't have Typescript definitions or default export structure issues
const SqliteStore = require('better-sqlite3-session-store')(session);

/**
 * Create and configure session middleware
 * Sessions are stored in SQLite database using better-sqlite3
 */
export function createSessionMiddleware() {
    let sessionStore;
    try {
        // Ensure directory exists
        const dbPath = path.join(DATA_DIR, 'sessions.db');
        const db = new Database(dbPath/*, { verbose: logger.info } */);

        sessionStore = new SqliteStore({
            client: db,
            expired: {
                clear: true,
                intervalMs: 900000 // 15min
            }
        });
        logger.info('[Session] Using SQLite store');
    } catch (err: any) {
        logger.warn('[Session] Failed to initialize SQLite store, falling back to MemoryStore:', err.message);
        sessionStore = new session.MemoryStore();
    }

    // SECURITY: Session secret must be configured via SESSION_SECRET in constants.ts
    const sessionSecret = SESSION_SECRET;
    if (!sessionSecret) {
        throw new Error('FATAL: SESSION_SECRET is required for session security');
    }

    return session({
        store: sessionStore,
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        name: 'master.sid', // Custom cookie name
        cookie: {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Secure in production
            sameSite: 'lax'
        },
        // Rolling session - extends expiration on each request
        rolling: true
    });
}
