-- Performance Indexes v3 — Composite indexes for high-volume query patterns
-- Audit P2: addresses missing coverage found in query pattern analysis

-- Orders: paginated listing by status (dashboard, order management)
CREATE INDEX IF NOT EXISTS idx_orders_status_created_desc ON orders(status, created_at DESC);

-- Orders: customer email lookups (gallery checkout, receipts)
CREATE INDEX IF NOT EXISTS idx_orders_customerEmail ON orders(customerEmail);

-- Orders: sync queue processing (cloud sync batch)
CREATE INDEX IF NOT EXISTS idx_orders_sync_status_updated ON orders(sync_status, updated_at);

-- Photos: gallery rendering — album photos sorted by creation time
CREATE INDEX IF NOT EXISTS idx_photos_albumId_created_at ON photos(albumId, created_at);

-- Photos: AI culling pipeline batch processing
CREATE INDEX IF NOT EXISTS idx_photos_cullingStatus ON photos(cullingStatus);

-- Kiosk sessions: fleet health monitoring (heartbeat checks)
CREATE INDEX IF NOT EXISTS idx_kiosk_sessions_last_seen ON kiosk_sessions(last_seen);

-- Fulfillment queue: priority-based job pickup in tight loop
CREATE INDEX IF NOT EXISTS idx_fulfillment_status_priority ON fulfillment_queue(status, priority DESC);

-- Kiosk transfer queue: pending job pickup
CREATE INDEX IF NOT EXISTS idx_transfer_queue_status ON kiosk_transfer_queue(status, created_at);

-- AI groups: album-scoped group listing
CREATE INDEX IF NOT EXISTS idx_ai_groups_albumId ON ai_groups(albumId);
