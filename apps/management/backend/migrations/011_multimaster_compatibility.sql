-- Add MultiMaster Scoping Columns
-- Phase: Global Multi-Tenant Expansion
-- Albums: Add desk_id and original_id
ALTER TABLE albums
ADD COLUMN desk_id TEXT;
ALTER TABLE albums
ADD COLUMN original_id TEXT;
-- Photos: Add desk_id and original_id
ALTER TABLE photos
ADD COLUMN desk_id TEXT;
ALTER TABLE photos
ADD COLUMN original_id TEXT;
-- Orders: Add desk_id and original_id
ALTER TABLE orders
ADD COLUMN desk_id TEXT;
ALTER TABLE orders
ADD COLUMN original_id TEXT;
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_albums_desk_original ON albums(desk_id, original_id);
CREATE INDEX IF NOT EXISTS idx_photos_desk_original ON photos(desk_id, original_id);
CREATE INDEX IF NOT EXISTS idx_orders_desk_original ON orders(desk_id, original_id);