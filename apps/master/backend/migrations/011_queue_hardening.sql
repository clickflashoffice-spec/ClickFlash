-- Add progress column to queues for real-time tracking
ALTER TABLE fulfillment_queue
ADD COLUMN progress INTEGER DEFAULT 0;
ALTER TABLE retention_queue
ADD COLUMN progress INTEGER DEFAULT 0;

-- Add status column to photos if not exists (needed for indexing)
ALTER TABLE photos ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE photos ADD COLUMN sync_status TEXT DEFAULT 'pending';

-- Additional indices for high-volume photo ingestion
CREATE INDEX IF NOT EXISTS idx_photos_status ON photos(status);
CREATE INDEX IF NOT EXISTS idx_photos_sync_status ON photos(sync_status);
CREATE INDEX IF NOT EXISTS idx_photos_album_created ON photos(albumId, created_at);