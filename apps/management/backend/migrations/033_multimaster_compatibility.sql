-- Renumbered from: 011_multimaster_compatibility.sql (duplicate 011 prefix)
-- Add MultiMaster Scoping Columns
-- Phase: Global Multi-Tenant Expansion
-- original_id was already added in 028_sync_columns.sql
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_albums_desk_original ON albums(desk_id, original_id);
CREATE INDEX IF NOT EXISTS idx_photos_desk_original ON photos(desk_id, original_id);
CREATE INDEX IF NOT EXISTS idx_orders_desk_original ON orders(desk_id, original_id);