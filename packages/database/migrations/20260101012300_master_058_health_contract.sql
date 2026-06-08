-- Phase 15: Startup Self-Test & Runtime Health Contract
-- Persists boot reports and runtime health state transitions

CREATE TABLE IF NOT EXISTS IF NOT EXISTS system_health_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    event_type TEXT NOT NULL CHECK(event_type IN ('BOOT', 'DEGRADED', 'RECOVERED', 'CRITICAL', 'FATAL', 'NOMINAL')),
    verdict TEXT NOT NULL CHECK(verdict IN ('READY', 'DEGRADED', 'FATAL')),
    probes_json TEXT,
    boot_duration_ms INTEGER,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_health_log_type ON system_health_log(event_type);
CREATE INDEX IF NOT EXISTS idx_health_log_ts ON system_health_log(timestamp);

-- Seed health contract settings
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES 
    ('health_disk_warn_percent', '90', datetime('now')),
    ('health_disk_critical_percent', '95', datetime('now')),
    ('health_min_free_gb', '1', datetime('now')),
    ('health_poll_interval_ms', '30000', datetime('now')),
    ('health_auto_recovery', 'true', datetime('now'));
