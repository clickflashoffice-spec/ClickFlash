-- Migration: Add password_must_change flag to users table
ALTER TABLE users ADD COLUMN password_must_change INTEGER DEFAULT 0;
