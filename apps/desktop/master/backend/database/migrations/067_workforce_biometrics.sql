-- Up
CREATE TABLE IF NOT EXISTS photographer_faces (
    photographer_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    station_id TEXT,
    face_vector TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shifts_proxy_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photographer_id TEXT NOT NULL,
    station_id TEXT,
    shift_type TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    biometric_method TEXT,
    biometric_confidence REAL,
    payload TEXT NOT NULL,
    synced INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
