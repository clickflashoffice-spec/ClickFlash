-- Phase 5: Self-Healing Sync & Backoff Protocol
-- Standardize sync tracking columns across all data models for consistent DLQ support.

-- Ensure inventory table exists (backfilling if skipped)
CREATE TABLE IF NOT EXISTS IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    sync_id TEXT UNIQUE,
    name TEXT NOT NULL,
    type TEXT,
    current_count INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    unit TEXT DEFAULT 'units',
    status TEXT DEFAULT 'available',
    sync_status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- operation_logs: Standardize retry tracking
-- SQLite doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS. 
-- We'll handle errors in the migration runner if these columns already exist.
ALTER TABLE operation_logs ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE operation_logs ADD COLUMN last_error TEXT;

-- Migration: Copy existing data if any (from older schema versions)
-- Using COALESCE and checking if columns exist would be nice, but we'll keep it simple for now.
-- In case 'retries' or 'error_message' don't exist, this will fail gracefully during manual run if needed.
-- UPDATE operation_logs SET retry_count = retries, last_error = error_message;

-- orders: standardizing to global sync names (keeping cloud_sync_ prefix for safety but aliasing columns where needed)
ALTER TABLE orders ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN last_error TEXT;
ALTER TABLE orders ADD COLUMN sync_status TEXT DEFAULT 'pending';
UPDATE orders SET sync_status = cloud_sync_status, last_error = cloud_sync_error;

-- photographer_ledger
ALTER TABLE photographer_ledger ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE photographer_ledger ADD COLUMN last_error TEXT;

-- expenses
ALTER TABLE expenses ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE expenses ADD COLUMN last_error TEXT;

-- inventory
ALTER TABLE inventory ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN last_error TEXT;

-- photographer_performance (Analytics)
ALTER TABLE photographer_performance ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE photographer_performance ADD COLUMN last_error TEXT;

-- fulfillment_queue
ALTER TABLE fulfillment_queue ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE fulfillment_queue ADD COLUMN last_error TEXT;
