-- Migration 009: Add missing columns to bookings table for Website integration
ALTER TABLE bookings
ADD COLUMN location TEXT;
ALTER TABLE bookings
ADD COLUMN message TEXT;
ALTER TABLE bookings
ADD COLUMN service_type TEXT;
ALTER TABLE bookings
ADD COLUMN detailsJSON JSON;