-- Migration 058: Add Session Timing (Safe Version)
-- Handles missing tables gracefully

-- First, ensure daily_resort_stats table exists
CREATE TABLE IF NOT EXISTS IF NOT EXISTS daily_resort_stats (
    date TEXT PRIMARY KEY,
    total_guests INTEGER DEFAULT 0,
    departures INTEGER DEFAULT 0,
    viewing_sessions INTEGER DEFAULT 0,
    daily_rent REAL DEFAULT 0,
    daily_labor REAL DEFAULT 0,
    sync_status TEXT DEFAULT 'pending',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Ensure photographer_performance table exists
-- Note: Foreign key constraint removed for compatibility
CREATE TABLE IF NOT EXISTS IF NOT EXISTS photographer_performance (
    id TEXT PRIMARY KEY,
    photographer_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    meetings_taken INTEGER DEFAULT 0,
    meetings_made INTEGER DEFAULT 0,
    categories JSON DEFAULT '{}',
    income_simple REAL DEFAULT 0,
    income_multiple REAL DEFAULT 0,
    photos_made_themes JSON DEFAULT '{}',
    sync_status TEXT DEFAULT 'pending',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(photographer_id, date)
);

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_photographer_performance_date ON photographer_performance(date);

-- Add columns to orders table (safe alter - SQLite supports ADD COLUMN)
ALTER TABLE orders ADD COLUMN session_start DATETIME;
ALTER TABLE orders ADD COLUMN session_end DATETIME;
ALTER TABLE orders ADD COLUMN session_duration_minutes INTEGER;

-- Add columns to albums table
ALTER TABLE albums ADD COLUMN meeting_tracked INTEGER DEFAULT 0;
ALTER TABLE albums ADD COLUMN no_sale_logged INTEGER DEFAULT 0;
ALTER TABLE albums ADD COLUMN order_converted INTEGER DEFAULT 0;
ALTER TABLE albums ADD COLUMN conversion_time_hours REAL;

-- Create index for session analytics
CREATE INDEX IF NOT EXISTS idx_orders_session_dates ON orders(session_start, session_end);
