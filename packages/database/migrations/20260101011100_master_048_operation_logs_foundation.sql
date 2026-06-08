-- 048_operation_logs_foundation.sql
-- Foundational table for Event Sourcing and Operation-based Sync (Law 01, Audit Finding)
CREATE TABLE IF NOT EXISTS IF NOT EXISTS operation_logs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    -- e.g., 'PHOTO_IMPORT', 'ORDER_CREATE', 'CONFIG_UPDATE'
    table_name TEXT,
    -- The target table affected
    record_id TEXT,
    -- The ID of the affected record
    payload TEXT NOT NULL,
    -- JSON representation of the operation data/delta
    timestamp INTEGER NOT NULL,
    -- Client-side timestamp (ms) for LWW/CRDT
    vector_clock TEXT,
    -- JSON/Stringified vector clock for distributed merge resolution
    status TEXT DEFAULT 'pending',
    -- 'pending', 'synced', 'failed'
    retries INTEGER DEFAULT 0,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Optimization indexes for sync polling and replay
CREATE INDEX IF NOT EXISTS idx_op_logs_status ON operation_logs(status);
CREATE INDEX IF NOT EXISTS idx_op_logs_timestamp ON operation_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_op_logs_composite ON operation_logs(table_name, record_id);