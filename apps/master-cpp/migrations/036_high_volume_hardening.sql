-- Phase 30: High-Volume Scale Hardening
-- Supports fast "Find My Photos" lookups and ensures storage path integrity
-- 1. Index for fast room number lookups across millions of records
CREATE INDEX IF NOT EXISTS idx_photos_roomNumber ON photos(roomNumber);
-- 2. Index for album-based sorting
CREATE INDEX IF NOT EXISTS idx_photos_album_created ON photos(albumId, created_at DESC);
-- 3. Composite for unique storage paths to prevent collisions
CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_unique_storage ON photos(storagePath);