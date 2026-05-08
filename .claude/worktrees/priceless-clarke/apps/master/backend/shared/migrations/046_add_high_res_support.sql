-- Add columns for high-resolution and watermarked photo support
-- Note: SQLite handled by better-sqlite3 migration system in db.ts
ALTER TABLE photos
ADD COLUMN watermarked_url TEXT;
ALTER TABLE photos
ADD COLUMN original_file TEXT;
-- Index for better sync performance
CREATE INDEX IF NOT EXISTS idx_photos_sync_status ON photos(sync_status);