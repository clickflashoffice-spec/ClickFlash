-- Renumbered from: 019_add_fleet_heartbeats_table.sql (duplicate 019 prefix)
-- Migration: Add fleet_heartbeats table for latest desk status
-- Created: March 13, 2026
-- Issue: Heartbeat endpoint was failing with 500 error because table didn't exist

CREATE TABLE IF NOT EXISTS fleet_heartbeats (
    desk_id TEXT PRIMARY KEY,
    last_seen TEXT NOT NULL,
    metrics TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fleet_heartbeats_desk ON fleet_heartbeats(desk_id);
CREATE INDEX IF NOT EXISTS idx_fleet_heartbeats_updated ON fleet_heartbeats(updated_at);
