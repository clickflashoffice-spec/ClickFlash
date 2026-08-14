-- Migration 009: RAW metadata columns and batch export tracking jobs

-- Add RAW photo columns to photos table
ALTER TABLE photos ADD COLUMN raw_r2_path TEXT;
ALTER TABLE photos ADD COLUMN raw_size INTEGER;
ALTER TABLE photos ADD COLUMN raw_status TEXT DEFAULT 'pending';
ALTER TABLE photos ADD COLUMN raw_metadata TEXT;

-- Table to track bulk RAW export jobs
CREATE TABLE IF NOT EXISTS raw_export_jobs (
    id TEXT PRIMARY KEY,
    event_id TEXT,
    status TEXT DEFAULT 'pending',
    total_files INTEGER DEFAULT 0,
    processed_files INTEGER DEFAULT 0,
    export_r2_path TEXT,
    filter_tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_raw_export_jobs_event ON raw_export_jobs(event_id);
