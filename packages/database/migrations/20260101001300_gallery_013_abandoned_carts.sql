-- Migration: Abandoned cart tracking for recovery emails
-- Date: 2026-05-17

-- Stores cart snapshots synced from the browser when a customer has an email
CREATE TABLE IF NOT EXISTS IF NOT EXISTS abandoned_carts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    album_id TEXT,
    items JSON NOT NULL,           -- serialized cart items [{photoId, name, price, quantity}]
    total DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'eur',
    session_id TEXT NOT NULL,      -- browser session for deduplication
    recovery_sent INTEGER DEFAULT 0, -- 0=not sent, 1=first email, 2=second email
    recovered INTEGER DEFAULT 0,   -- 1 if customer completed purchase after reminder
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    recovered_at DATETIME
);

-- Fast lookup for cron: carts older than 1h that haven't been emailed yet
CREATE INDEX idx_abandoned_carts_recovery ON abandoned_carts(recovery_sent, updated_at);
-- Find by email for merging/deduplication
CREATE INDEX idx_abandoned_carts_email ON abandoned_carts(email);
-- Find by session for upsert from frontend
CREATE UNIQUE INDEX idx_abandoned_carts_session ON abandoned_carts(session_id);

-- Insert migration record
INSERT INTO migrations (version, applied_at) VALUES (13, datetime('now'));
