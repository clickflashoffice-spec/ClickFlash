-- Migration 008: QR Self-Service Tokens
CREATE TABLE IF NOT EXISTS qr_tokens (
    token TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    access_code TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
