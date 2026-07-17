-- 053_kiosk_transfer_queue.sql
-- Implements background transfer jobs for Master-Touch pushes (Law 13 & 15)

CREATE TABLE IF NOT EXISTS kiosk_transfer_queue (
    id TEXT PRIMARY KEY,
    album_id TEXT NOT NULL,
    kiosk_id TEXT, -- Optional, for kiosk-specific pushes
    destination_path TEXT NOT NULL,
    photo_ids TEXT, -- JSON array of specific photo IDs, NULL means entire album
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    progress INTEGER DEFAULT 0,
    error_log TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transfer_status ON kiosk_transfer_queue(status);
CREATE INDEX IF NOT EXISTS idx_transfer_album ON kiosk_transfer_queue(album_id);
