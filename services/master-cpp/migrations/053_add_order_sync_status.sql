-- Migration 053: Add sync_status to orders for Gallery sync tracking
-- Enables pushing local Master orders to cloud Gallery

-- Add sync tracking columns to orders
ALTER TABLE orders ADD COLUMN sync_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN sync_id TEXT;

-- Create index for efficient sync queries
CREATE INDEX IF NOT EXISTS idx_orders_sync_status ON orders(sync_status);
CREATE INDEX IF NOT EXISTS idx_orders_sync_id ON orders(sync_id);

-- Mark existing orders as synced to avoid re-syncing old data
UPDATE orders SET sync_status = 'synced' WHERE sync_status IS NULL;
