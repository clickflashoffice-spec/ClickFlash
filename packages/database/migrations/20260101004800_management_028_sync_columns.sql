-- Renumbered from: 01_sync_columns.sql (non-standard numbering)
-- Only add columns if they don't exist
-- desk_id, original_id for orders
ALTER TABLE orders ADD COLUMN desk_id TEXT;
ALTER TABLE orders ADD COLUMN original_id TEXT;

-- desk_id, original_id, eventType for albums
ALTER TABLE albums ADD COLUMN desk_id TEXT;
ALTER TABLE albums ADD COLUMN original_id TEXT;
ALTER TABLE albums ADD COLUMN eventType TEXT;

-- desk_id, original_id for photos
ALTER TABLE photos ADD COLUMN desk_id TEXT;
ALTER TABLE photos ADD COLUMN original_id TEXT;
