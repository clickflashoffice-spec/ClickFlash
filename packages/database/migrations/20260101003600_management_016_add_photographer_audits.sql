-- Migration 016: Add Photographer Audits and Heartbeat Refinement
-- Supports Phase 70 (Audits) and Phase 35 (Fleet Monitoring)

-- Daily Photographer Audits: Ingested from Master Stations for BI analytics
CREATE TABLE IF NOT EXISTS IF NOT EXISTS daily_photographer_audits (
    id                  TEXT PRIMARY KEY, -- deskId_photographerId_date
    desk_id             TEXT NOT NULL,
    photographer_id     INTEGER NOT NULL,
    date                TEXT NOT NULL,
    total_customers     INTEGER DEFAULT 0,
    imported_photos     INTEGER DEFAULT 0,
    sold_photos         INTEGER DEFAULT 0,
    bad_quality_photos  INTEGER DEFAULT 0,
    sales_revenue       REAL DEFAULT 0,
    created_at          TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at          TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(desk_id, photographer_id, date)
);

CREATE INDEX IF NOT EXISTS idx_audits_desk ON daily_photographer_audits(desk_id);
CREATE INDEX IF NOT EXISTS idx_audits_date ON daily_photographer_audits(date);
CREATE INDEX IF NOT EXISTS idx_audits_photographer ON daily_photographer_audits(photographer_id);

-- Ensure fleet_heartbeat_history has necessary columns
-- (Note: SQLite doesn't support multiple columns in one ALTER TABLE, 
-- but since we use CREATE TABLE IF NOT EXISTS IF NOT EXISTS in schema.sql, 
-- this migration is primarily for existing test databases)

CREATE TABLE IF NOT EXISTS IF NOT EXISTS fleet_heartbeat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    desk_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    orders_today INTEGER DEFAULT 0,
    photos_today INTEGER DEFAULT 0,
    pending_sync INTEGER DEFAULT 0,
    sync_status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fleet_heartbeat_desk ON fleet_heartbeat_history(desk_id);
CREATE INDEX IF NOT EXISTS idx_fleet_heartbeat_time ON fleet_heartbeat_history(timestamp);
