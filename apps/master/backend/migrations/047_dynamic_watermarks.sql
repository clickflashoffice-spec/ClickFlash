-- Migration: Add dynamic watermarks table
CREATE TABLE IF NOT EXISTS watermark_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    overlay_path TEXT NOT NULL,
    opacity REAL DEFAULT 1.0,
    scale REAL DEFAULT 1.0,
    position TEXT DEFAULT 'center', -- center, top-left, bottom-right, etc.
    target_camera_id TEXT, -- If set, only applies to this camera
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_watermarks_camera ON watermark_configs(target_camera_id);
