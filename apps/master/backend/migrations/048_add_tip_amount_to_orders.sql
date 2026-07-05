-- Migration: Add tip_amount to orders table
ALTER TABLE orders ADD COLUMN tip_amount REAL DEFAULT 0;
