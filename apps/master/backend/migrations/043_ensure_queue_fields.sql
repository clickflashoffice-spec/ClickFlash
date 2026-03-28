-- Add error_log and retry_count columns if they don't exist
-- Note: SQLite doesn't support IF NOT EXISTS in ADD COLUMN directly in all versions, 
-- but we'll use a safe approach or assume the migration system handles errors/checking.
-- Since this is an explicit task to add them, we assume they might be missing.
ALTER TABLE retention_queue
ADD COLUMN error_log TEXT;
ALTER TABLE retention_queue
ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE fulfillment_queue
ADD COLUMN error_log TEXT;
ALTER TABLE fulfillment_queue
ADD COLUMN retry_count INTEGER DEFAULT 0;