-- Align sync schema with Master/Touch requirements
-- This includes adding counter to sync_sequences and sequence columns to operation_logs

-- Add counter to sync_sequences
ALTER TABLE sync_sequences ADD COLUMN counter INTEGER DEFAULT 0;

-- Add sequence Tracking to operation_logs
ALTER TABLE operation_logs ADD COLUMN sequence_number INTEGER;
ALTER TABLE operation_logs ADD COLUMN desk_id TEXT;

-- Create index for faster sync lookups
CREATE INDEX IF NOT EXISTS idx_op_logs_desk_seq ON operation_logs(desk_id, sequence_number);
