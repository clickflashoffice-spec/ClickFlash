-- ClickFlash v2.0.0 Base SQLite Schema

CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    album_id TEXT,
    captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    edit_metadata TEXT DEFAULT '{}',
    synced_to_cloud INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    station_id TEXT NOT NULL,
    customer_rfid TEXT,
    items_json TEXT NOT NULL,
    total_cents INTEGER NOT NULL,
    status TEXT DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS licenses (
    id TEXT PRIMARY KEY,
    key_signature TEXT NOT NULL,
    hardware_fingerprint TEXT NOT NULL,
    features_json TEXT NOT NULL,
    activated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
