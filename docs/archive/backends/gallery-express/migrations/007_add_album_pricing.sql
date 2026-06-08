-- Add pricing and email columns to albums table
-- price_single: Price for a single photo
-- price_full: Price for the full gallery
-- customer_email: Email for notifications
ALTER TABLE albums
ADD COLUMN price_single REAL DEFAULT 0;
ALTER TABLE albums
ADD COLUMN price_full REAL DEFAULT 0;
ALTER TABLE albums
ADD COLUMN customer_email TEXT;