-- Add metadata_only column to kiosk_transfer_queue for Smart Kiosk Sync
-- This enables metadata-only transfer mode that skips actual file copying
-- NOTE: Table is created in 053. On fresh DBs this is a no-op; 053 should include the column.

CREATE TABLE IF NOT EXISTS IF NOT EXISTS kiosk_transfer_queue (
    id TEXT PRIMARY KEY,
    album_id TEXT NOT NULL,
    kiosk_id TEXT,
    destination_path TEXT NOT NULL,
    photo_ids TEXT,
    status TEXT DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    error_log TEXT,
    retry_count INTEGER DEFAULT 0,
    metadata_only INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- For existing DBs where table already exists without the column
-- SQLite will error on duplicate column, but db.ts handles "duplicate column name" gracefully
