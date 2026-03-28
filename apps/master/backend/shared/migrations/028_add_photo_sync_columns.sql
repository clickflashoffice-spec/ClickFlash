-- Up Migration
ALTER TABLE photos
ADD COLUMN sync_status TEXT DEFAULT 'pending';
ALTER TABLE photos
ADD COLUMN sync_id TEXT;