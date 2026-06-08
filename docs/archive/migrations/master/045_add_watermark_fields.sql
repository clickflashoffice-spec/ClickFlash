-- Migration: Add fields for Watermarked Previews & High-Resolution Downloads
-- Adds 'watermarked_url' (text) and 'original_file' (text) to 'photos' table
-- 1. Add 'watermarked_url' column (if not exists)
-- SQLite does not support IF NOT EXISTS in ADD COLUMN, so we just try.
-- However, since better-sqlite3 runs this in a transaction, if it fails (duplicate), the script handles it.
-- But standard practice in this codebase (see db.ts) is to catch "duplicate column name" errors.
ALTER TABLE photos
ADD COLUMN watermarked_url TEXT;
-- 2. Add 'original_file' column (if not exists)
ALTER TABLE photos
ADD COLUMN original_file TEXT;