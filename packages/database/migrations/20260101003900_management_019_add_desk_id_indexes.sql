-- Schema Update: Add missing desk_id indexes for query optimization
-- These indexes support the mandatory desk_id isolation in RecordService.listRecords()

-- Critical desk_id indexes for WHERE desk_id = ? filtering
CREATE INDEX IF NOT EXISTS idx_users_desk_id ON users(desk_id);
CREATE INDEX IF NOT EXISTS idx_albums_desk_id ON albums(desk_id);
CREATE INDEX IF NOT EXISTS idx_photos_desk_id ON photos(desk_id);
CREATE INDEX IF NOT EXISTS idx_orders_desk_id ON orders(desk_id);
CREATE INDEX IF NOT EXISTS idx_products_desk_id ON products(desk_id);
CREATE INDEX IF NOT EXISTS idx_bookings_desk_id ON bookings(desk_id);
CREATE INDEX IF NOT EXISTS idx_expenses_desk_id ON expenses(desk_id);
CREATE INDEX IF NOT EXISTS idx_loans_desk_id ON loans(desk_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_desk_id ON adjustments(desk_id);
CREATE INDEX IF NOT EXISTS idx_inventory_desk_id ON inventory(desk_id);
CREATE INDEX IF NOT EXISTS idx_equipment_desk_id ON equipment(desk_id);
CREATE INDEX IF NOT EXISTS idx_prospects_desk_id ON prospects(desk_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_desk_id ON ai_tasks(desk_id);
CREATE INDEX IF NOT EXISTS idx_photographer_ledger_desk_id ON photographer_ledger(desk_id);
CREATE INDEX IF NOT EXISTS idx_daily_objectives_desk_id ON daily_objectives(desk_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_desk_id ON crm_leads(desk_id);
CREATE INDEX IF NOT EXISTS idx_triage_queue_desk_id ON triage_queue(desk_id);
CREATE INDEX IF NOT EXISTS idx_daily_photographer_audits_desk_id ON daily_photographer_audits(desk_id);
CREATE INDEX IF NOT EXISTS idx_system_yield_stats_desk_id ON system_yield_stats(desk_id);
CREATE INDEX IF NOT EXISTS idx_system_stats_desk_id ON system_stats(desk_id);
CREATE INDEX IF NOT EXISTS idx_retention_stats_desk_id ON retention_stats(desk_id);

-- Composite indexes for common query patterns (desk_id + sort/filter)
CREATE INDEX IF NOT EXISTS idx_albums_desk_date ON albums(desk_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_photos_desk_album ON photos(desk_id, albumId);
CREATE INDEX IF NOT EXISTS idx_orders_desk_status ON orders(desk_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_desk_created ON orders(desk_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_desk_date ON bookings(desk_id, bookingDate DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_desk_date ON expenses(desk_id, date DESC);

-- Composite index for operation_logs (critical for sync)
CREATE INDEX IF NOT EXISTS idx_op_logs_desk_status ON operation_logs(desk_id, status);

-- Index for access_pin lookups (order verification)
CREATE INDEX IF NOT EXISTS idx_orders_access_pin ON orders(access_pin);

-- Index for magic_link_token lookups
CREATE INDEX IF NOT EXISTS idx_orders_magic_token ON orders(magic_link_token);

-- Index for email lookups in orders
CREATE INDEX IF NOT EXISTS idx_orders_email_status ON orders(email, status);

-- Vector clocks index for sync ordering
CREATE INDEX IF NOT EXISTS idx_vector_clocks_site ON vector_clocks(site_id);
