-- Add Kiosk Folder Paths
-- Down migration not supported for SQLite add column
ALTER TABLE kiosks
ADD COLUMN uploadFolderPath TEXT;
ALTER TABLE kiosks
ADD COLUMN ordersFolderPath TEXT;