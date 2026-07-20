-- Add Shifts table
CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY,
    photographer_id TEXT NOT NULL,
    type TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    station_id TEXT,
    sync_status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add Rosters table
CREATE TABLE IF NOT EXISTS rosters (
    id TEXT PRIMARY KEY,
    photographer_id TEXT NOT NULL,
    shift_start DATETIME,
    shift_end DATETIME,
    station_id TEXT NOT NULL,
    status TEXT DEFAULT 'SCHEDULED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
