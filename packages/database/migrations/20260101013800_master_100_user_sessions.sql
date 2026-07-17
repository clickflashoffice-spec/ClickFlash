-- Migration: User session tracking for concurrent session management
-- Phase 5-D: allow users to list and revoke active sessions
-- Date: 2026-05-07

CREATE TABLE IF NOT EXISTS user_sessions (
    id          TEXT PRIMARY KEY,           -- UUID v4 session identifier
    user_id     INTEGER NOT NULL,           -- FK → users.id
    user_email  TEXT NOT NULL,
    token_hash  TEXT NOT NULL,              -- SHA-256 hex of JWT (first 16 chars for display)
    device_info TEXT,                       -- UA string truncated to 200 chars
    ip_address  TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen   DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked_at  DATETIME,                   -- NULL = active; set on logout/revoke
    is_active   INTEGER NOT NULL DEFAULT 1  -- 1 = active, 0 = revoked (denormalised for fast queries)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user    ON user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token   ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created ON user_sessions(created_at);
