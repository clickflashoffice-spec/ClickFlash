-- Optimization Indexes for Phase C (Server-Side Filtering & Heartbeats)
-- 1. Index for Orders Filtering
-- Supports: ORDER BY created_at DESC, WHERE status=?, WHERE clientName LIKE ...
CREATE INDEX IF NOT EXISTS idx_orders_filter ON orders(created_at, status, clientName);
-- Note: kiosks.last_seen column and index added in migration 034