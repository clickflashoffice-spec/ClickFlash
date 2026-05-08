-- Migration to track cloud synchronization for validated orders
ALTER TABLE orders ADD COLUMN cloud_sync_status TEXT DEFAULT 'pending' CHECK(cloud_sync_status IN ('pending', 'syncing', 'synced', 'failed'));
ALTER TABLE orders ADD COLUMN cloud_sync_error TEXT;
