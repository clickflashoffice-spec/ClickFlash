-- Migration 005: Fleet Nodes
CREATE TABLE IF NOT EXISTS fleet_nodes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    status TEXT DEFAULT 'offline',
    last_seen TIMESTAMP,
    version TEXT,
    metrics_json TEXT,
    sync_status_json TEXT,
    orders_json TEXT,
    photos_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
