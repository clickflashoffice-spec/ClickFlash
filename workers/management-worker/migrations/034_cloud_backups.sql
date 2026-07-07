-- Migration 034: Cloud Backups & Incremental Snapshots
-- Stores metadata for automated SQLite-to-D1/R2 incremental backups from Master desks

CREATE TABLE IF NOT EXISTS cloud_backups (
    id              TEXT PRIMARY KEY,
    desk_id         TEXT NOT NULL,
    r2_key          TEXT NOT NULL,
    type            TEXT DEFAULT 'incremental' CHECK (type IN ('incremental', 'full')),
    since           TEXT,
    checksum        TEXT,
    size_bytes      INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cloud_backups_desk ON cloud_backups (desk_id, created_at DESC);
