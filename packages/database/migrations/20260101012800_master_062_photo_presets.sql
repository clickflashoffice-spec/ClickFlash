-- backend/migrations/062_photo_presets.sql
-- Create photo_presets table for reusable editing templates
CREATE TABLE IF NOT EXISTS IF NOT EXISTS photo_presets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    adjustments TEXT NOT NULL, -- JSON string of ManualEdits
    is_system INTEGER DEFAULT 0, -- 1 for built-in, 0 for user-created
    category TEXT DEFAULT 'Custom',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup by category
CREATE INDEX IF NOT EXISTS idx_photo_presets_category ON photo_presets(category);
