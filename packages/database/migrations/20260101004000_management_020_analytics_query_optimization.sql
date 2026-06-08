-- Schema Update: Analytics Query Optimization
-- Optimizes common date-range queries and JOIN operations

-- Orders table: Date range + status + desk (most common analytics pattern)
CREATE INDEX IF NOT EXISTS idx_orders_date_status ON orders(date, status);
CREATE INDEX IF NOT EXISTS idx_orders_date_desk_status ON orders(date, desk_id, status);

-- Albums table: Date range queries for reporting
CREATE INDEX IF NOT EXISTS idx_albums_date ON albums(date);

-- Photos table: Album lookup optimization
CREATE INDEX IF NOT EXISTS idx_photos_albumId ON photos(albumId);

-- Foreign key indexes for JOIN performance
CREATE INDEX IF NOT EXISTS idx_orders_albumId ON orders(albumId);
CREATE INDEX IF NOT EXISTS idx_orders_photographerId ON orders(photographerId);

-- Daily resort stats: Date range queries (BI dashboard)
CREATE INDEX IF NOT EXISTS idx_daily_resort_stats_date ON daily_resort_stats(date);
CREATE INDEX IF NOT EXISTS idx_daily_resort_stats_desk_date ON daily_resort_stats(desk_id, date);

-- Photographer performance: Date range queries (BI dashboard)
CREATE INDEX IF NOT EXISTS idx_photographer_performance_date ON photographer_performance(date);
CREATE INDEX IF NOT EXISTS idx_photographer_performance_desk_date ON photographer_performance(desk_id, date);

-- Operation logs: Sequence number lookups (sync performance)
CREATE INDEX IF NOT EXISTS idx_op_logs_desk_hub_index ON operation_logs(desk_id, hub_index);
CREATE INDEX IF NOT EXISTS idx_op_logs_timestamp ON operation_logs(timestamp);

-- Fleet heartbeat: Recent lookups
CREATE INDEX IF NOT EXISTS idx_fleet_heartbeat_history_desk_time ON fleet_heartbeat_history(desk_id, timestamp DESC);
