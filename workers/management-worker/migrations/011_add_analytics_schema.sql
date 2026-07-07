-- Migration 011: Add Analytics Fields and Indexes
-- 1. Add view_count to albums if it doesn't exist
ALTER TABLE albums
ADD COLUMN view_count INTEGER DEFAULT 0;
-- 2. Add indexes for faster range queries on Orders
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_photographerId ON orders(photographerId);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
-- 3. Add indexes for faster range queries on Albums
CREATE INDEX IF NOT EXISTS idx_albums_date ON albums(date);
CREATE INDEX IF NOT EXISTS idx_albums_photographerId ON albums(photographerId);
CREATE INDEX IF NOT EXISTS idx_albums_created_at ON albums(created_at);
-- 4. Add indexes for faster range queries on Users (for filtering photographers)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);