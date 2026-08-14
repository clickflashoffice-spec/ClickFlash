-- Add lastSeen column to kiosk_sessions table (camelCase for PocketBase compatibility)
ALTER TABLE kiosk_sessions ADD COLUMN lastSeen DATETIME;

-- Copy data from old column if exists
UPDATE kiosk_sessions SET lastSeen = last_seen WHERE last_seen IS NOT NULL;
