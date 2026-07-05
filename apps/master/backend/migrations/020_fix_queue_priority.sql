-- 051_fix_queue_priority.sql
-- Force add priority column if 050 failed
-- We use a separate migration to ensure this runs even if 050 was marked as done but failed halfway
ALTER TABLE fulfillment_queue
ADD COLUMN priority INTEGER DEFAULT 1;