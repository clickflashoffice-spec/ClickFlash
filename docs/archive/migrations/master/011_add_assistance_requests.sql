-- Migration: Add assistance_requests table
-- Purpose: Store assistance requests from Touch kiosks for Master Portal notification

CREATE TABLE IF NOT EXISTS assistance_requests (
    id TEXT PRIMARY KEY,
    kioskId TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'pending', -- pending, resolved, dismissed
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolvedAt DATETIME,
    resolvedBy INTEGER, -- user id who resolved it
    FOREIGN KEY(resolvedBy) REFERENCES users(id)
);

-- Index for querying pending requests
CREATE INDEX IF NOT EXISTS idx_assistance_requests_status ON assistance_requests(status);
CREATE INDEX IF NOT EXISTS idx_assistance_requests_kioskId ON assistance_requests(kioskId);
CREATE INDEX IF NOT EXISTS idx_assistance_requests_createdAt ON assistance_requests(createdAt);

