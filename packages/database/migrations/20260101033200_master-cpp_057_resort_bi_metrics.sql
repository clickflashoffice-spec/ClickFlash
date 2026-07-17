-- Migration 057: Resort Business Intelligence Metrics
-- Tracking Daily Sales Reports (DSR) and Photographer Performance

-- Operational metrics per day per site
CREATE TABLE IF NOT EXISTS daily_resort_stats (
    date TEXT PRIMARY KEY,
    total_guests INTEGER DEFAULT 0,
    departures INTEGER DEFAULT 0,
    viewing_sessions INTEGER DEFAULT 0, -- Counter for Touch/Master viewing
    daily_rent REAL DEFAULT 0,
    daily_labor REAL DEFAULT 0,
    sync_status TEXT DEFAULT 'pending',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Photographer performance per day
CREATE TABLE IF NOT EXISTS photographer_performance (
    id TEXT PRIMARY KEY,
    photographer_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    meetings_taken INTEGER DEFAULT 0,
    meetings_made INTEGER DEFAULT 0,
    categories JSON DEFAULT '{}', -- M. Ca, M. Re, V. Late, etc.
    income_simple REAL DEFAULT 0,
    income_multiple REAL DEFAULT 0,
    photos_made_themes JSON DEFAULT '{}', -- Pool/Beach, Night, etc.
    sync_status TEXT DEFAULT 'pending',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(photographer_id) REFERENCES users(id),
    UNIQUE(photographer_id, date)
);

-- Index for analytics retrieval
CREATE INDEX IF NOT EXISTS idx_photographer_performance_date ON photographer_performance(date);
