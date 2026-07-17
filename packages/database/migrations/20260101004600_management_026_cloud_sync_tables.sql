-- Renumbered from: 014_cloud_sync_tables.sql (duplicate 014 prefix)
-- Migration 014: Phase 39 Cloud Sync Tables
-- Adds tables for cross-master operation log, fleet heartbeats, and retention stats

-- Operation logs: bi-directional sync between all Master desks via Hub relay
CREATE TABLE IF NOT EXISTS operation_logs (
    id              TEXT NOT NULL,
    desk_id         TEXT NOT NULL,
    type            TEXT NOT NULL CHECK (type IN ('INSERT', 'UPDATE', 'DELETE')),
    table_name      TEXT NOT NULL,
    record_id       TEXT,
    payload         TEXT,
    timestamp       INTEGER,
    sequence_number INTEGER,
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, desk_id)
);

CREATE INDEX IF NOT EXISTS idx_operation_logs_desk ON operation_logs (desk_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_table ON operation_logs (table_name);

-- Fleet heartbeats: one row per Master desk, updated on each heartbeat
CREATE TABLE IF NOT EXISTS fleet_heartbeats (
    desk_id     TEXT PRIMARY KEY,
    last_seen   TEXT NOT NULL,
    metrics     TEXT,   -- JSON blob: orders_today, photos_today, pending_sync, sync_status
    updated_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

-- System stats: retention/moneytrash stats per desk
CREATE TABLE IF NOT EXISTS system_stats (
    desk_id                     TEXT PRIMARY KEY,
    retention_queue_size        INTEGER DEFAULT 0,
    retention_potential_value   TEXT DEFAULT '0.00',
    retention_status            TEXT DEFAULT 'idle',
    last_updated                TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Add desk_id column to orders if not present (multi-master scoping)
-- Wrapped in a safe guard (D1 doesn't support IF NOT EXISTS on ALTER TABLE)
-- The application layer uses desk_id / deskId interchangeably in the payload body.
-- This migration adds the canonical column; existing rows default to empty string.
ALTER TABLE orders ADD COLUMN desk_id TEXT DEFAULT '';
