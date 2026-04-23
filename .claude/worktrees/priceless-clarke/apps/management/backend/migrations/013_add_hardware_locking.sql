-- Phase 20: Hardware Fingerprinting & Session Locking
-- Add machine_id column to users table to support station-to-hardware binding
ALTER TABLE users
ADD COLUMN machine_id TEXT;
-- Index for machine_id lookups
CREATE INDEX IF NOT EXISTS idx_users_machine_id ON users(machine_id);