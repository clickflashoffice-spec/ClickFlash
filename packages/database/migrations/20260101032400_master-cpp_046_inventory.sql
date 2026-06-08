-- Add inventory table for consumable tracking (Phase 34)
CREATE TABLE IF NOT EXISTS IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    -- 'Ribbon', 'Paper', etc.
    current_count INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Initial stock for testing
INSERT
    OR IGNORE INTO inventory (
        id,
        name,
        type,
        current_count,
        low_stock_threshold
    )
VALUES (
        'default_ribbon',
        'Standard P525 Ribbon',
        'Ribbon',
        500,
        50
    );