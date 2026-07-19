-- Migration 004: Workforce Biometrics & Shift Management

CREATE TABLE IF NOT EXISTS photographers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    station_id TEXT,
    face_vector TEXT,
    face_enrolled_at INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE shifts ADD COLUMN biometric_method TEXT DEFAULT 'LOCAL_AUTH';
ALTER TABLE shifts ADD COLUMN biometric_confidence REAL;
ALTER TABLE shifts ADD COLUMN face_vector_hash TEXT;
ALTER TABLE shifts ADD COLUMN station_id TEXT;
