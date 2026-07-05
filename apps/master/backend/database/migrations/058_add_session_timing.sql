-- Phase 75: Add Session Timing to Photographer Performance
ALTER TABLE photographer_performance ADD COLUMN total_session_seconds INTEGER DEFAULT 0;
ALTER TABLE photographer_performance ADD COLUMN session_count INTEGER DEFAULT 0;

-- Ensure indexes for performance
CREATE INDEX IF NOT EXISTS idx_perf_date_photog ON photographer_performance(date, photographer_id);
