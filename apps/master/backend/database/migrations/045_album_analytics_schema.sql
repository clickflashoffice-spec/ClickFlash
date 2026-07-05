-- Phase 32: Advanced Album Analytics
-- Add engagement tracking to photos
ALTER TABLE photos
ADD COLUMN viewCount INTEGER DEFAULT 0;
ALTER TABLE photos
ADD COLUMN selectionCount INTEGER DEFAULT 0;
-- Add explicit album link to orders for performance
ALTER TABLE orders
ADD COLUMN albumId TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_album_id ON orders(albumId);
-- Backfill albumId from items JSON if possible
-- This assumes the first item in the items array represents the primary album
UPDATE orders
SET albumId = json_extract(items, '$[0].albumId')
WHERE albumId IS NULL
    AND json_valid(items);