-- 050_decoupled_fulfillment_queues.sql
-- Refines fulfillment_queue for decoupled background bundling (Audit Finding)
-- 1. Add 'type' to distinguish between individual assets and full bundles
ALTER TABLE fulfillment_queue
ADD COLUMN type TEXT DEFAULT 'ASSET';
-- 2. Add 'priority' for better queue management (e.g. prioritize bundles over retention)
-- Note: Might already exist in some versions, ignore error if so.
ALTER TABLE fulfillment_queue
ADD COLUMN priority INTEGER DEFAULT 1;
-- 3. Add 'progress' field for real-time UI tracking during bundling/uploads
ALTER TABLE fulfillment_queue
ADD COLUMN progress INTEGER DEFAULT 0;
-- 4. Optimization Indices
CREATE INDEX IF NOT EXISTS idx_fulfillment_status_type ON fulfillment_queue(status, type);
CREATE INDEX IF NOT EXISTS idx_fulfillment_order ON fulfillment_queue(order_id);