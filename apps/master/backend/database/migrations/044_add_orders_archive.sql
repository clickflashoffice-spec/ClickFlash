-- Create archive table for orders older than 30 days
-- Mirrors the structure of the main 'orders' table as of Migration 043
CREATE TABLE IF NOT EXISTS orders_archive (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    clientName TEXT,
    email TEXT,
    status TEXT,
    total REAL DEFAULT 0,
    photographerId INTEGER,
    destinationId TEXT,
    paymentMethod TEXT,
    appliedDiscount REAL DEFAULT 0,
    items JSON,
    created_at DATETIME,
    -- Extended columns from migrations 002, 009, 026, 035
    phone TEXT,
    source TEXT,
    albumId TEXT,
    roomNumber TEXT,
    customerEmail TEXT,
    paymentIntentId TEXT,
    kioskId TEXT,
    updated_at DATETIME,
    orderNumber TEXT,
    rfidTag TEXT,
    -- Archival Metadata
    archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Indexes for reporting on archived data
CREATE INDEX IF NOT EXISTS idx_orders_archive_date ON orders_archive(date);
CREATE INDEX IF NOT EXISTS idx_orders_archive_email ON orders_archive(email);