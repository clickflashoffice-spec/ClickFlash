-- Harmonize Photos and Albums schema with Master app
-- This ensures that photos and albums pushed from Master can be stored in Touch without errors.

-- 1. Add missing columns to photos table
-- roomNumber is critical for searching
ALTER TABLE photos ADD COLUMN roomNumber TEXT;
-- URLs and paths for different tiers
ALTER TABLE photos ADD COLUMN tinyUrl TEXT;
ALTER TABLE photos ADD COLUMN previewUrl TEXT;
ALTER TABLE photos ADD COLUMN thumbnailUrl TEXT;
-- Watermark and original file support
ALTER TABLE photos ADD COLUMN watermarked_url TEXT;
ALTER TABLE photos ADD COLUMN original_file TEXT;
-- Quality and metadata
ALTER TABLE photos ADD COLUMN metadata JSON;
ALTER TABLE photos ADD COLUMN quality_flags JSON;
-- State management
ALTER TABLE photos ADD COLUMN isFavorite INTEGER DEFAULT 0;
-- Sync tracking (optional but good for consistency)
ALTER TABLE photos ADD COLUMN sync_status TEXT;
ALTER TABLE photos ADD COLUMN sync_id TEXT;
-- Analytics
ALTER TABLE photos ADD COLUMN viewCount INTEGER DEFAULT 0;
ALTER TABLE photos ADD COLUMN selectionCount INTEGER DEFAULT 0;
ALTER TABLE photos ADD COLUMN cullingStatus TEXT;
ALTER TABLE photos ADD COLUMN aiGroupId TEXT;

-- 2. Add missing columns to albums table
ALTER TABLE albums ADD COLUMN eventType TEXT;
ALTER TABLE albums ADD COLUMN customerEmail TEXT;
ALTER TABLE albums ADD COLUMN room_number TEXT; -- Some versions use room_number, Master uses roomNumber. Adding both or just roomNumber?
-- Master's constants.ts says 'roomNumber': 'roomNumber'.

-- 3. Cleanup: Ensure updated_at exists where expected
ALTER TABLE photos ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_photos_roomNumber ON photos(roomNumber);
CREATE INDEX IF NOT EXISTS idx_photos_sync_id ON photos(sync_id);
