-- Migration 062: API Request Queue for Offline Resilience
CREATE TABLE IF NOT EXISTS api_request_queue (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    method TEXT NOT NULL,
    headers TEXT,
    body TEXT,
    sync_status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_request_queue_sync_status ON api_request_queue(sync_status);
