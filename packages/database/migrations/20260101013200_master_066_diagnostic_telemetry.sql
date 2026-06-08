-- Migration 066: Diagnostic Telemetry Hardening
-- Adds local persistent storage for health snapshots and heartbeat status tracking.

CREATE TABLE IF NOT EXISTS IF NOT EXISTS diagnostic_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    cpu_temp REAL,
    memory_pressure REAL,
    disk_free_gb REAL,
    disk_total_gb REAL,
    db_size_mb REAL,
    photo_count INTEGER,
    album_count INTEGER,
    status TEXT DEFAULT 'ok', -- 'ok', 'warning', 'critical'
    sync_status TEXT DEFAULT 'pending', -- 'pending', 'synced'
    last_error TEXT
);

-- Index for analytics and history viewing
CREATE INDEX IF NOT EXISTS idx_diag_history_timestamp ON diagnostic_history(timestamp);

-- Settings extensions for heartbeat tracking
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('diag_last_heartbeat', '', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('diag_heartbeat_status', 'never_synced', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('diag_failure_count', '0', CURRENT_TIMESTAMP);
