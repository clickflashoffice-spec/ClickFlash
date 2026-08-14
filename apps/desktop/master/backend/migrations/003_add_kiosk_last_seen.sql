-- Migration: Add last_seen column to kiosks table
-- Purpose: Fix WriteBuffer flush errors for kiosk heartbeats
-- Date: 2026-01-19
ALTER TABLE kiosks
ADD COLUMN last_seen TEXT DEFAULT NULL;
-- Create index for efficient queries on last_seen
CREATE INDEX IF NOT EXISTS idx_kiosks_last_seen ON kiosks(last_seen);