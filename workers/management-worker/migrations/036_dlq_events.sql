-- Migration 036: DLQ Events Table
-- Stores failed background tasks and cloud sync operations for automated replay.

CREATE TABLE IF NOT EXISTS dlq_events (
    id TEXT PRIMARY KEY,
    queue_name TEXT NOT NULL,
    payload TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,
    error_reason TEXT,
    next_retry_at TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processed', 'failed_permanently')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dlq_events_status_retry ON dlq_events (status, next_retry_at);
