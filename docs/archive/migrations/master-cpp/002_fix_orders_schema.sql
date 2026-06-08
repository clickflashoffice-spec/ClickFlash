-- Migration: Add missing columns to orders table for parity with Touch app
-- Path: master/backend/shared/migrations/002_fix_orders_schema.sql
-- Phone number for orders
ALTER TABLE orders
ADD COLUMN phone TEXT;
-- Source (touch/manual)
ALTER TABLE orders
ADD COLUMN source TEXT;
-- Associated album ID
ALTER TABLE orders
ADD COLUMN albumId TEXT;
-- Customer Room Number (from album or manual)
ALTER TABLE orders
ADD COLUMN roomNumber TEXT;
-- Explicit customer email (sometimes different from client record)
ALTER TABLE orders
ADD COLUMN customerEmail TEXT;
-- Payment Intent / Transaction ID
ALTER TABLE orders
ADD COLUMN paymentIntentId TEXT;
-- Remote Kiosk ID that generated the order
ALTER TABLE orders
ADD COLUMN kioskId TEXT;
-- Updated at timestamp
ALTER TABLE orders
ADD COLUMN updated_at DATETIME;