-- Migration 053: Inventory sync columns (Master-Specific)
-- Adds sync tracking to the inventory table defined in backend/migrations/046_inventory.sql

ALTER TABLE inventory ADD COLUMN sync_status TEXT DEFAULT 'pending';
ALTER TABLE inventory ADD COLUMN sync_id TEXT;
ALTER TABLE inventory ADD COLUMN desk_id TEXT;

CREATE INDEX IF NOT EXISTS idx_inventory_sync_status ON inventory(sync_status);
CREATE INDEX IF NOT EXISTS idx_inventory_sync_id ON inventory(sync_id);
