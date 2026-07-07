-- Performance Optimization Indexes
-- Adds indexes to improve query performance for frequently accessed columns

-- Albums table indexes
CREATE INDEX IF NOT EXISTS idx_albums_photographerId ON albums(photographerId);
CREATE INDEX IF NOT EXISTS idx_albums_date ON albums(date);
CREATE INDEX IF NOT EXISTS idx_albums_status ON albums(status);
CREATE INDEX IF NOT EXISTS idx_albums_roomNumber ON albums(roomNumber);
CREATE INDEX IF NOT EXISTS idx_albums_created_at ON albums(created_at);
CREATE INDEX IF NOT EXISTS idx_albums_updated_at ON albums(updated_at);

-- Photos table indexes (additional to existing ones)
CREATE INDEX IF NOT EXISTS idx_photos_photographerId ON photos(photographerId);
CREATE INDEX IF NOT EXISTS idx_photos_category ON photos(category);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at);
CREATE INDEX IF NOT EXISTS idx_photos_updated_at ON photos(updated_at);

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
-- CREATE INDEX IF NOT EXISTS idx_orders_albumId ON orders(albumId); -- Column does not exist
CREATE INDEX IF NOT EXISTS idx_orders_photographerId ON orders(photographerId);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(updated_at);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_destinationId ON users(destinationId);

-- Products table indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_isFeatured ON products(isFeatured);

-- Kiosks table indexes
CREATE INDEX IF NOT EXISTS idx_kiosks_status ON kiosks(status);
CREATE INDEX IF NOT EXISTS idx_kiosks_lastHeartbeat ON kiosks(lastHeartbeat);

-- Settings table indexes
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_albums_photographer_status ON albums(photographerId, status);
CREATE INDEX IF NOT EXISTS idx_photos_album_category ON photos(albumId, category);
CREATE INDEX IF NOT EXISTS idx_orders_status_date ON orders(status, date);

