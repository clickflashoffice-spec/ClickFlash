-- Create daily_objectives table to track photographer targets
CREATE TABLE IF NOT EXISTS IF NOT EXISTS daily_objectives (
    id TEXT PRIMARY KEY,
    photographer_id TEXT NOT NULL,
    date TEXT NOT NULL,
    -- YYYY-MM-DD
    target INTEGER NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    -- Pending, Completed
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending',
    sync_id TEXT,
    FOREIGN KEY (photographer_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Index for faster lookups by photographer and date
CREATE INDEX IF NOT EXISTS idx_daily_objectives_photographer_date ON daily_objectives(photographer_id, date);