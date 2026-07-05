-- Schema Update: Add missing desk_id indexes for query optimization
-- These indexes support the mandatory desk_id isolation in RecordService.listRecords()

-- Add desk_id to all tables before indexing
ALTER TABLE products ADD COLUMN desk_id TEXT DEFAULT '';
ALTER TABLE bookings ADD COLUMN desk_id TEXT DEFAULT '';

-- Critical desk_id indexes for WHERE desk_id = ? filtering
CREATE INDEX IF NOT EXISTS idx_users_desk_id ON users(desk_id);
CREATE INDEX IF NOT EXISTS idx_albums_desk_id ON albums(desk_id);
CREATE INDEX IF NOT EXISTS idx_photos_desk_id ON photos(desk_id);
CREATE INDEX IF NOT EXISTS idx_orders_desk_id ON orders(desk_id);
CREATE INDEX IF NOT EXISTS idx_products_desk_id ON products(desk_id);
CREATE INDEX IF NOT EXISTS idx_bookings_desk_id ON bookings(desk_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_desk_id ON crm_leads(desk_id);
CREATE INDEX IF NOT EXISTS idx_daily_photographer_audits_desk_id ON daily_photographer_audits(desk_id);
CREATE INDEX IF NOT EXISTS idx_system_yield_stats_desk_id ON system_yield_stats(desk_id);
CREATE INDEX IF NOT EXISTS idx_system_stats_desk_id ON system_stats(desk_id);

-- Composite indexes for common query patterns (desk_id + sort/filter)
CREATE INDEX IF NOT EXISTS idx_albums_desk_date ON albums(desk_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_photos_desk_album ON photos(desk_id, albumId);
CREATE INDEX IF NOT EXISTS idx_orders_desk_status ON orders(desk_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_desk_created ON orders(desk_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_desk_date ON bookings(desk_id, bookingDate DESC);

-- Index for email lookups in orders
CREATE INDEX IF NOT EXISTS idx_orders_email_status ON orders(email, status);
