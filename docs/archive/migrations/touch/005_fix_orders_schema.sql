-- 005_fix_orders_schema.sql
-- Add missing columns to orders table for parity with Master and code expectations
-- SQLite doesn't support adding multiple columns in one ALTER TABLE, so we do them individually.
-- The DatabaseManager in db.ts will ignore 'duplicate column name' errors if they already exist.
ALTER TABLE orders
ADD COLUMN phone TEXT;
ALTER TABLE orders
ADD COLUMN source TEXT;
ALTER TABLE orders
ADD COLUMN albumId TEXT;
ALTER TABLE orders
ADD COLUMN roomNumber TEXT;
ALTER TABLE orders
ADD COLUMN customerEmail TEXT;
ALTER TABLE orders
ADD COLUMN paymentIntentId TEXT;
ALTER TABLE orders
ADD COLUMN kioskId TEXT;