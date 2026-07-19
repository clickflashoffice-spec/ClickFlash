-- Migration 007: Global Settings
CREATE TABLE IF NOT EXISTS global_settings (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT
);

-- Insert some default settings
INSERT OR IGNORE INTO global_settings (id, key, value, version) VALUES 
('setting_1', 'branding', '{"primaryColor":"#ff0000","logoUrl":""}', 1),
('setting_2', 'pricing', '{"defaultPhotoPrice":10.00,"currency":"USD"}', 1);
