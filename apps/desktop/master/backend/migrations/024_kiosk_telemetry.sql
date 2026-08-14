-- Phase 13: Add telemetry fields to kiosks table for real-time fleet monitoring
-- This allows the Master station to track kiosk health, version skew, and network quality.

-- Add last_seen for heartbeat tracking
ALTER TABLE kiosks ADD COLUMN last_seen DATETIME;

-- Add ip_address for network diagnostics
ALTER TABLE kiosks ADD COLUMN ip_address TEXT;

-- Add app_version for fleet consistency checks
ALTER TABLE kiosks ADD COLUMN app_version TEXT;

-- Add latency_ms for network quality monitoring
ALTER TABLE kiosks ADD COLUMN latency_ms INTEGER DEFAULT 0;

-- Index last_seen for fast "Offline" status queries
CREATE INDEX IF NOT EXISTS idx_kiosks_last_seen ON kiosks(last_seen);
