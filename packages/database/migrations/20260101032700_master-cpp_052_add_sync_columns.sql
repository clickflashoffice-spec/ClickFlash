-- Migration 052: Add sync_status columns for multi-master sync
-- Adds sync tracking to tables that need to sync to Management Hub

-- Expenses sync tracking
ALTER TABLE expenses ADD COLUMN sync_status TEXT DEFAULT 'pending';
ALTER TABLE expenses ADD COLUMN sync_id TEXT;
ALTER TABLE expenses ADD COLUMN desk_id TEXT;

-- Create indexes for efficient sync queries
CREATE INDEX IF NOT EXISTS idx_expenses_sync_status ON expenses(sync_status);
CREATE INDEX IF NOT EXISTS idx_expenses_sync_id ON expenses(sync_id);

-- Equipment table (new - for equipment tracking sync)
CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'Available',
    -- Available, In Use, Maintenance, Retired
    assignedToPhotographerId TEXT,
    destinationId TEXT,
    purchaseDate TEXT,
    warrantyExpiry TEXT,
    serialNumber TEXT,
    notes TEXT,
    sync_status TEXT DEFAULT 'pending',
    sync_id TEXT,
    desk_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_equipment_sync_status ON equipment(sync_status);
CREATE INDEX IF NOT EXISTS idx_equipment_assigned ON equipment(assignedToPhotographerId);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);

-- Sync audit log (for tracking all sync operations locally)
CREATE TABLE IF NOT EXISTS sync_audit_log (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    -- INSERT, UPDATE, DELETE
    status TEXT DEFAULT 'pending',
    -- pending, synced, failed
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    synced_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_audit_status ON sync_audit_log(status);
CREATE INDEX IF NOT EXISTS idx_sync_audit_table ON sync_audit_log(table_name, record_id);
