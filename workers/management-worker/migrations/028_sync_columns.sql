-- Renumbered from: 01_sync_columns.sql (non-standard numbering)
-- Only add columns if they don't exist
-- original_id for orders (desk_id was added by 026_cloud_sync_tables.sql)
ALTER TABLE orders ADD COLUMN original_id TEXT;

-- desk_id, original_id, eventType for albums
ALTER TABLE albums ADD COLUMN desk_id TEXT;
ALTER TABLE albums ADD COLUMN original_id TEXT;

-- desk_id, original_id for photos
ALTER TABLE photos ADD COLUMN desk_id TEXT;
ALTER TABLE photos ADD COLUMN original_id TEXT;
