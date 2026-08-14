-- Up
ALTER TABLE photos ADD COLUMN autoEdits TEXT;
ALTER TABLE photos ADD COLUMN autoEnhanced BOOLEAN DEFAULT 0;

-- Down
