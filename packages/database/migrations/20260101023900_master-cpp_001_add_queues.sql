-- Up Migration
CREATE TABLE IF NOT EXISTS IF NOT EXISTS fulfillment_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    -- pending, processing, completed, failed
    retry_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    error_log TEXT
);
CREATE TABLE IF NOT EXISTS IF NOT EXISTS retention_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    album_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    error_log TEXT
);
CREATE INDEX IF NOT EXISTS idx_fulfillment_order ON fulfillment_queue(order_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_status ON fulfillment_queue(status);
CREATE INDEX IF NOT EXISTS idx_retention_album ON retention_queue(album_id);
CREATE INDEX IF NOT EXISTS idx_retention_status ON retention_queue(status);