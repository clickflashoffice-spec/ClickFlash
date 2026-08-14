-- Migration: 013_add_performance_indexes.sql
-- Purpose: Add indexes for common query patterns to improve performance
-- Date: 2026-03-19

-- Index for albums.kiosk_ready (filtered on every sync operation)
CREATE INDEX IF NOT EXISTS idx_albums_kiosk_ready ON albums(kiosk_ready);

-- Index for albums.status (used in sync filter)
CREATE INDEX IF NOT EXISTS idx_albums_status ON albums(status);

-- Index for orders.status (filtered during export operations)
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Index for orders.source (filter by 'touch' source)
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source);

-- Index for photos.albumId (join key for photo lookups)
CREATE INDEX IF NOT EXISTS idx_photos_album_id ON photos(albumId);

-- Index for users.email (used in login/authentication)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index for settings.key (frequently queried for config lookup)
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Index for kiosk_sessions.kioskId (heartbeat lookups)
CREATE INDEX IF NOT EXISTS idx_kiosk_sessions_kiosk_id ON kiosk_sessions(kioskId);
