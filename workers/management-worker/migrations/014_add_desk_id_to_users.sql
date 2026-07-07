-- Migration 014: Add desk_id to users for Station Binding
-- Adds support for hardware-locked station accounts in the Management Hub

ALTER TABLE users ADD COLUMN desk_id TEXT;
-- Index for fast lookup during login and station monitoring
CREATE INDEX idx_users_desk_id ON users(desk_id);
