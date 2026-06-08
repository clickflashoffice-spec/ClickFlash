-- Add health and monitoring columns to destinations for fleet tracking
ALTER TABLE destinations
ADD COLUMN last_seen DATETIME;
ALTER TABLE destinations
ADD COLUMN status TEXT DEFAULT 'Offline';
ALTER TABLE destinations
ADD COLUMN health_metrics JSON;
ALTER TABLE destinations
ADD COLUMN ip_address TEXT;
ALTER TABLE destinations
ADD COLUMN version TEXT;