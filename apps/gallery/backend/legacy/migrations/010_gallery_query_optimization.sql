-- Gallery Database Optimization: Part 2
-- Desk isolation, date range queries, and token lookups

-- Desk isolation indexes
CREATE INDEX IF NOT EXISTS idx_albums_desk_id ON albums(desk_id);
CREATE INDEX IF NOT EXISTS idx_photos_desk_id ON photos(desk_id);
CREATE INDEX IF NOT EXISTS idx_orders_desk_id ON orders(desk_id);
CREATE INDEX IF NOT EXISTS idx_users_desk_id ON users(desk_id);

-- Date range indexes for analytics
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date);
CREATE INDEX IF NOT EXISTS idx_orders_date_status ON orders(date, status);
CREATE INDEX IF NOT EXISTS idx_albums_date ON albums(date);

-- Token lookup indexes
CREATE INDEX IF NOT EXISTS idx_orders_access_pin ON orders(access_pin);
CREATE INDEX IF NOT EXISTS idx_orders_magic_token ON orders(magic_link_token);

-- Composite indexes for common patterns
CREATE INDEX IF NOT EXISTS idx_albums_desk_status ON albums(desk_id, status);
CREATE INDEX IF NOT EXISTS idx_photos_desk_album ON photos(desk_id, albumId);
CREATE INDEX IF NOT EXISTS idx_orders_desk_status ON orders(desk_id, status);

-- Access code lookups (customer gallery access)
CREATE INDEX IF NOT EXISTS idx_albums_access_code ON albums(access_code);
CREATE INDEX IF NOT EXISTS idx_photos_access_code ON photos(access_code);
