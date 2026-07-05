-- High-Volume Hardening indices (Phase 30)
-- 1. Index for fast photo retrieval by album ID
CREATE INDEX IF NOT EXISTS idx_photos_albumId ON photos(albumId);
-- 2. Index for fast order retrieval by room number
CREATE INDEX IF NOT EXISTS idx_orders_roomNumber ON orders(roomNumber);