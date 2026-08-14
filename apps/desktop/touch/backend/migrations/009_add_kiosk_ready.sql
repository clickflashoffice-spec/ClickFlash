-- Add kiosk_ready column to albums table
ALTER TABLE albums ADD COLUMN kiosk_ready INTEGER DEFAULT 0;
