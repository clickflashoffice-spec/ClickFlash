-- 049_sync_sequences_and_vector_clocks.sql
-- Sequence tracking and conflict resolution support for Operation-Based Sync (Phase 30)
-- Track last processed operation ID from remote sites
CREATE TABLE IF NOT EXISTS IF NOT EXISTS sync_sequences (
    id TEXT PRIMARY KEY,
    -- desk_id_${site_id}
    site_id TEXT UNIQUE NOT NULL,
    last_processed_id TEXT,
    -- ID of the last op_log successfully replayed from this site
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Vector Clocks for multi-master conflict resolution
CREATE TABLE IF NOT EXISTS IF NOT EXISTS vector_clocks (
    id TEXT PRIMARY KEY,
    -- desk_id_${site_id}
    site_id TEXT UNIQUE NOT NULL,
    counter INTEGER DEFAULT 0,
    -- Local logical counter for this site
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Ensure operation_logs has site tracking
-- Note: 'vector_clock' already exists from 048, but we may need 'sequence_number' for linear replays per site
-- We'll add 'sequence_number' to operation_logs to allow strict ordering without gaps
ALTER TABLE operation_logs
ADD COLUMN sequence_number INTEGER;
ALTER TABLE operation_logs
ADD COLUMN desk_id TEXT;
-- Index for linear sequence replay
CREATE INDEX IF NOT EXISTS idx_op_logs_sequence ON operation_logs(desk_id, sequence_number);