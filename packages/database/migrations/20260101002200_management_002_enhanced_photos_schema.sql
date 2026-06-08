-- Enhanced Photos Schema Migration
-- Adds metadata fields for better photo management
-- Note: SQLite doesn't support IF NOT EXISTS with ALTER TABLE ADD COLUMN
-- Columns will be added only if they don't already exist (checked in db.js)

-- Add new columns to photos table
-- These will fail silently if columns already exist (handled by migration system)
ALTER TABLE photos ADD COLUMN fileSize INTEGER; -- File size in bytes
ALTER TABLE photos ADD COLUMN width INTEGER; -- Image width in pixels
ALTER TABLE photos ADD COLUMN height INTEGER; -- Image height in pixels
ALTER TABLE photos ADD COLUMN fileHash TEXT; -- SHA-256 hash for deduplication
ALTER TABLE photos ADD COLUMN mimeType TEXT; -- MIME type (image/jpeg, etc.)
ALTER TABLE photos ADD COLUMN thumbnailUrl TEXT; -- Thumbnail filename
ALTER TABLE photos ADD COLUMN originalFilename TEXT; -- Original uploaded filename
ALTER TABLE photos ADD COLUMN storagePath TEXT; -- Organized storage path (albumId/photoId.jpg)

-- Create index on fileHash for faster duplicate detection
CREATE INDEX IF NOT EXISTS idx_photos_fileHash ON photos(fileHash);

-- Create index on albumId for faster album queries
CREATE INDEX IF NOT EXISTS idx_photos_albumId ON photos(albumId);

