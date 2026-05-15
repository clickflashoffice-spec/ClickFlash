-- Renumbered from: 003_add_pricing_schema.sql (duplicate 003 prefix)
-- Add pricing columns to albums table
ALTER TABLE albums
ADD COLUMN pricePerPhoto REAL DEFAULT 0;
ALTER TABLE albums
ADD COLUMN fullGalleryPrice REAL DEFAULT 0;