-- Migration: Add Money Trash support to Customer Gallery
-- Creates tables for archived photos and purchase tracking

-- Archived Photos Table
CREATE TABLE IF NOT EXISTS IF NOT EXISTS archived_photos (
    id TEXT PRIMARY KEY,
    original_photo_id TEXT,
    album_id TEXT,
    access_code TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    title TEXT,
    metadata TEXT, -- JSON: {width, height, size, camera, etc.}
    status TEXT DEFAULT 'available', -- 'available', 'purchased', 'expired'
    archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    purchased_at DATETIME,
    order_id TEXT,
    price REAL DEFAULT 15.00,
    discount_percentage INTEGER DEFAULT 50,
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- Index for fast access code lookups
CREATE INDEX IF NOT EXISTS idx_archived_photos_access_code ON archived_photos(access_code);
CREATE INDEX IF NOT EXISTS idx_archived_photos_status ON archived_photos(status);
CREATE INDEX IF NOT EXISTS idx_archived_photos_expires ON archived_photos(expires_at);

-- Gallery Settings Table (if not exists)
CREATE TABLE IF NOT EXISTS IF NOT EXISTS gallery_settings (
    id TEXT PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default Money Trash Configuration
INSERT OR REPLACE INTO gallery_settings (id, setting_key, setting_value)
VALUES (
    'money_trash_default',
    'money_trash_config',
    '{
        "enabled": true,
        "retentionDays": 30,
        "discountPercentage": 50,
        "watermarkEnabled": true,
        "watermarkText": "LAST CHANCE",
        "minOrderValue": 5,
        "autoDeleteExpired": true
    }'
);

-- Money Trash Purchase Log
CREATE TABLE IF NOT EXISTS IF NOT EXISTS moneytrash_purchases (
    id TEXT PRIMARY KEY,
    photo_id TEXT NOT NULL,
    access_code TEXT NOT NULL,
    order_id TEXT NOT NULL,
    customer_email TEXT,
    original_price REAL,
    discount_percentage INTEGER,
    final_price REAL,
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    download_count INTEGER DEFAULT 0,
    last_download_at DATETIME,
    FOREIGN KEY (photo_id) REFERENCES archived_photos(id),
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_moneytrash_purchases_date ON moneytrash_purchases(purchased_at);
CREATE INDEX IF NOT EXISTS idx_moneytrash_purchases_access ON moneytrash_purchases(access_code);

-- Access Codes Table (extended for Money Trash)
-- Note: This assumes access_codes table exists from main schema
-- Adding Money Trash specific fields via settings JSON

-- Sync Queue for Master App integration
CREATE TABLE IF NOT EXISTS IF NOT EXISTS moneytrash_sync_queue (
    id TEXT PRIMARY KEY,
    photo_id TEXT NOT NULL,
    source_type TEXT NOT NULL, -- 'master', 'uploader'
    source_url TEXT,
    action TEXT NOT NULL, -- 'add', 'update', 'delete'
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    retry_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON moneytrash_sync_queue(status);

-- Revenue Summary View
CREATE VIEW IF NOT EXISTS moneytrash_revenue_summary AS
SELECT 
    date(purchased_at) as date,
    COUNT(*) as total_purchases,
    SUM(original_price) as total_original_value,
    SUM(final_price) as total_revenue,
    SUM(original_price - final_price) as total_discounts_given,
    AVG(discount_percentage) as avg_discount_percentage
FROM moneytrash_purchases
GROUP BY date(purchased_at)
ORDER BY date DESC;

-- Trigger: Auto-update download count
CREATE TRIGGER IF NOT EXISTS trg_update_download_count
AFTER UPDATE OF last_download_at ON moneytrash_purchases
BEGIN
    UPDATE moneytrash_purchases 
    SET download_count = download_count + 1 
    WHERE id = NEW.id;
END;

-- Trigger: Cleanup expired photos (mark as expired)
CREATE TRIGGER IF NOT EXISTS trg_mark_expired_photos
AFTER INSERT ON archived_photos
BEGIN
    UPDATE archived_photos 
    SET status = 'expired'
    WHERE status = 'available' 
    AND expires_at < datetime('now');
END;
