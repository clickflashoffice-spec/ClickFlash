-- Performance Indexes v5 — Shared Core Schema Indexes
-- Phase 2.1: Critical high-volume query indexes across photos, orders, and albums tables
-- These indexes target columns established in shared migrations (001-065).

-- Photos: fast deduplication and album-scoped lookup during import pipeline (photoProcessor.ts)
CREATE INDEX IF NOT EXISTS idx_photos_album_filehash ON photos(albumId, fileHash);

-- Photos: fast identification of pending candidates for cloud sync batching (cloudSyncService.ts)
CREATE INDEX IF NOT EXISTS idx_photos_sync_created ON photos(sync_status, created_at);

-- Orders: fast lookup by primary email field (maintenance.ts, orders.ts search and lookups)
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);

-- Orders: fast lookup by orderNumber (orders.ts search, verification, and fulfillment services)
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(orderNumber);

-- Orders: fast lookup by client name (orders.ts search, dashboard filters)
CREATE INDEX IF NOT EXISTS idx_orders_client_name ON orders(clientName);

-- Albums: fast lookup for finalized/status albums filtered by update timestamp (campaignScheduler.ts)
CREATE INDEX IF NOT EXISTS idx_albums_status_updated_at ON albums(status, updated_at);
