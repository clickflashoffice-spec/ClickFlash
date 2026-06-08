-- Migration 018: Add BI Sync Tables for Multi-Master Aggregation
-- Supports Phase 75 (Resort BI) and Phase 400 (360 Verification)

-- 1. Daily Resort Stats (Hub Version - Multi-Master)
CREATE TABLE IF NOT EXISTS daily_resort_stats (
    id                  TEXT PRIMARY KEY, -- deskId_date
    desk_id             TEXT NOT NULL,
    date                TEXT NOT NULL,
    viewing_sessions    INTEGER DEFAULT 0,
    total_revenue       REAL DEFAULT 0,
    printing_jobs       INTEGER DEFAULT 0,
    pending_uploads     INTEGER DEFAULT 0,
    cloud_sync_status   TEXT DEFAULT 'synced',
    created_at          TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at          TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(desk_id, date)
);

CREATE INDEX IF NOT EXISTS idx_resort_stats_desk ON daily_resort_stats(desk_id);
CREATE INDEX IF NOT EXISTS idx_resort_stats_date ON daily_resort_stats(date);

-- 2. Photographer Performance (Hub Version - Multi-Master)
CREATE TABLE IF NOT EXISTS photographer_performance (
    id                  TEXT PRIMARY KEY, -- deskId_photographerId_date
    desk_id             TEXT NOT NULL,
    photographer_id     INTEGER NOT NULL,
    date                TEXT NOT NULL,
    meetings_taken      INTEGER DEFAULT 0,
    meetings_made       INTEGER DEFAULT 0,
    income_simple       REAL DEFAULT 0,
    income_multiple     REAL DEFAULT 0,
    categories          JSON DEFAULT '{}',
    avg_session_duration INTEGER DEFAULT 0,
    calculation_source  TEXT DEFAULT 'master',
    sync_status         TEXT DEFAULT 'synced',
    created_at          TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at          TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(desk_id, photographer_id, date)
);

CREATE INDEX IF NOT EXISTS idx_photographer_performance_desk ON photographer_performance(desk_id);
CREATE INDEX IF NOT EXISTS idx_photographer_performance_date ON photographer_performance(date);
CREATE INDEX IF NOT EXISTS idx_photographer_performance_id ON photographer_performance(photographer_id);
