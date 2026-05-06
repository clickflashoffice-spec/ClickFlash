-- Create gallery_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS gallery_settings (
    id TEXT PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSON NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Seed default Money Trash config if not exists
INSERT
    OR IGNORE INTO gallery_settings (id, setting_key, setting_value)
VALUES (
        'money_trash_default',
        'money_trash_config',
        '{"enabled": false, "retentionMinutes": 120, "emailTriggerTime": 30, "discountPercentage": 50}'
    );