-- Up
ALTER TABLE photo_faces
ADD COLUMN box TEXT;
-- Update existing records with meaningful default if possible, 
-- but since box is a new requirement and photo_faces is a result of analysis,
-- existing records will likely be reindexed or left without boxes.
-- Assuming JSON format: {"x": 0, "y": 0, "width": 0, "height": 0}
-- Down
-- SQLite does not support dropping columns easily in all versions, 
-- but we usually follow the 'Up' only pattern for simple additions.