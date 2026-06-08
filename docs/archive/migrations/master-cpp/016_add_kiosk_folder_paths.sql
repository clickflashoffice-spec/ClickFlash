-- Add folder paths to kiosks table for multi-kiosk support
ALTER TABLE kiosks ADD COLUMN uploadFolderPath TEXT;
ALTER TABLE kiosks ADD COLUMN ordersFolderPath TEXT;
