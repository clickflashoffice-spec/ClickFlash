-- Add manualEdits column to photos table
-- Stores JSON string of edit parameters (crop, rotate, retouchActions, etc.)
ALTER TABLE photos
ADD COLUMN manualEdits TEXT;