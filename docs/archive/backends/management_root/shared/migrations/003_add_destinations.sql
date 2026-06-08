-- Add Destinations table if it doesn't exist
CREATE TABLE IF NOT EXISTS destinations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    type TEXT NOT NULL,
    licenseKey TEXT,
    featuresJSON JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

