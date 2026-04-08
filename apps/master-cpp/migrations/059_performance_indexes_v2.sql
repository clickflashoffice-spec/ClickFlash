-- Database Performance Optimization v2
-- Focus: Speeding up folderMonitor existence checks and sync resolution

-- Composite index for folder monitor existence checks (Law 15 / Phase 130)
CREATE INDEX IF NOT EXISTS idx_photos_album_filename ON photos(albumId, originalFilename);

-- Fast sync resolution index
CREATE INDEX IF NOT EXISTS idx_photos_updated_at ON photos(updated_at);

-- Index for album ready status (Kiosk display speed)
CREATE INDEX IF NOT EXISTS idx_albums_kiosk_ready ON albums(kiosk_ready);

-- Index for session type filtering
CREATE INDEX IF NOT EXISTS idx_photos_category_id ON photos(category);

-- Hardening the orders table for concurrent kiosk hits
CREATE INDEX IF NOT EXISTS idx_orders_sync_status ON orders(sync_status);
