-- Seed default Data Management config if not exists into standard settings table
INSERT OR IGNORE INTO settings (id, key, value, created_at, updated_at)
VALUES (
    'data_management_default',
    'data_management_settings',
    '{"masterImportRetentionDays": 30, "touchKioskRetentionDays": 7, "backupSoldOrders": true, "backupLocation": "pb_data/backup/orders", "autoDeleteEnabled": true}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
