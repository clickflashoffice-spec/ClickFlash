-- Migration 055: Add pairing_tokens table
-- Replaces in-memory Map storage for pairing tokens to survive server restarts.

CREATE TABLE IF NOT EXISTS IF NOT EXISTS pairing_tokens (
    token TEXT PRIMARY KEY,
    kiosk_id TEXT,
    kiosk_name TEXT,
    http_url TEXT,
    ws_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    used_at DATETIME,
    used_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_pairing_tokens_expires_at ON pairing_tokens (expires_at);
