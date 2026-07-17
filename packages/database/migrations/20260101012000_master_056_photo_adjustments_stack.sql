-- Create photo_adjustments table for non-destructive editing
CREATE TABLE IF NOT EXISTS photo_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo_id TEXT NOT NULL,
    adjustments TEXT NOT NULL, -- JSON string of the adjustment stack
    version INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(photo_id)
);

-- Index for fast lookup by photo_id
CREATE INDEX IF NOT EXISTS idx_photo_adjustments_photo_id ON photo_adjustments(photo_id);

-- Operational Audit Log for AI actions
CREATE TABLE IF NOT EXISTS ai_operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo_id TEXT NOT NULL,
    operation_type TEXT NOT NULL, -- 'retouch', 'heal', 'exposure'
    parameters TEXT, -- JSON parameters
    photographer_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
