-- Add Session Types table
CREATE TABLE IF NOT EXISTS IF NOT EXISTS session_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    numberOfPhotos INTEGER,
    price REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

