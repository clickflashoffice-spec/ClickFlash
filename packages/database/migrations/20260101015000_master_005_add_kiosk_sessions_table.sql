-- Create kiosk_sessions table
CREATE TABLE IF NOT EXISTS IF NOT EXISTS kiosk_sessions (
    id TEXT PRIMARY KEY,
    kioskId TEXT,
    startTime DATETIME,
    endTime DATETIME,
    status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);