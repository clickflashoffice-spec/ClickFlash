-- Migration: Add audit tables for 360-degree audit trail
-- Date: 2026-04-14

-- Upload audit trail
CREATE TABLE IF NOT EXISTS audit_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    correlation_id TEXT NOT NULL,
    event TEXT NOT NULL,
    order_id TEXT,
    photo_id TEXT,
    file_name TEXT,
    file_size INTEGER,
    bytes_uploaded INTEGER,
    error TEXT,
    duration INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_uploads_correlation ON audit_uploads(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_uploads_order ON audit_uploads(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_uploads_created ON audit_uploads(created_at);

-- Order sync audit trail
CREATE TABLE IF NOT EXISTS audit_order_sync (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    correlation_id TEXT NOT NULL,
    event TEXT NOT NULL,
    order_id TEXT NOT NULL,
    album_id TEXT,
    customer_email TEXT,
    photo_count INTEGER,
    total_amount REAL,
    gallery_order_id TEXT,
    error TEXT,
    duration INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_order_correlation ON audit_order_sync(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_order_order ON audit_order_sync(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_order_created ON audit_order_sync(created_at);

-- Sales sync audit trail
CREATE TABLE IF NOT EXISTS audit_sales_sync (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    correlation_id TEXT NOT NULL,
    event TEXT NOT NULL,
    sync_date TEXT NOT NULL,
    photographer_id TEXT,
    imported_photos INTEGER DEFAULT 0,
    sold_photos INTEGER DEFAULT 0,
    sales_revenue REAL DEFAULT 0,
    total_customers INTEGER DEFAULT 0,
    error TEXT,
    duration INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_sales_correlation ON audit_sales_sync(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_sales_date ON audit_sales_sync(sync_date);
CREATE INDEX IF NOT EXISTS idx_audit_sales_photographer ON audit_sales_sync(photographer_id);
CREATE INDEX IF NOT EXISTS idx_audit_sales_created ON audit_sales_sync(created_at);
