-- Migration 059: Add isFavorite to photos table
ALTER TABLE photos ADD COLUMN isFavorite INTEGER DEFAULT 0;
