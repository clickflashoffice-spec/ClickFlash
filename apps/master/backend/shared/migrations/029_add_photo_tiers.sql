-- Add specialized photo tiers for progressive loading
ALTER TABLE photos
ADD COLUMN previewUrl TEXT;
ALTER TABLE photos
ADD COLUMN tinyUrl TEXT;