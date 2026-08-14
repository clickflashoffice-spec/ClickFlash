-- 052_add_missing_priorities.sql
-- Force add priority column to queues if missing (Audit Finding Fix)
-- This migration is idempotent because DatabaseManager ignores 'duplicate column name' errors.

ALTER TABLE fulfillment_queue
ADD COLUMN priority INTEGER DEFAULT 1;

ALTER TABLE face_indexing_queue
ADD COLUMN priority INTEGER DEFAULT 1;

-- Also ensure updated_at indices for performance
CREATE INDEX IF NOT EXISTS idx_fulfillment_updated ON fulfillment_queue(updated_at);
CREATE INDEX IF NOT EXISTS idx_face_queue_updated ON face_indexing_queue(updated_at);
