-- Fix login_history schema to match the API expectations
-- Add missing columns: user_id, status, reason
-- Map old columns to new ones

-- Add user_id column if it doesn't exist
ALTER TABLE login_history ADD COLUMN user_id TEXT;

-- Add status column if it doesn't exist (maps to success: 1=success, 0=failed)
ALTER TABLE login_history ADD COLUMN status TEXT DEFAULT 'failed';

-- Add reason column if it doesn't exist (maps to failure_reason)
ALTER TABLE login_history ADD COLUMN reason TEXT;

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
