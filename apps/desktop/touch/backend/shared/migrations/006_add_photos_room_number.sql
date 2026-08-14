-- Migration 006: Add roomNumber to photos table
-- Touch Search Support: Face recognition leads to Room Number leads to all photos in room.
ALTER TABLE photos
ADD COLUMN roomNumber TEXT;