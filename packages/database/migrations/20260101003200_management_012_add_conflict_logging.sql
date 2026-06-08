-- Add Conflict Logging for High-Res Resilience
-- Phase: MultiMaster Reliability & Audit
CREATE TABLE IF NOT EXISTS IF NOT EXISTS sync_conflicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    existing_desk_id TEXT NOT NULL,
    incoming_desk_id TEXT NOT NULL,
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved INTEGER DEFAULT 0
);
-- Index for quick lookup of active conflicts
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_unresolved ON sync_conflicts(resolved, table_name);