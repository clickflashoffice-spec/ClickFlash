-- backend/migrations/057_retention_defaults.sql
-- Phase 14: Industrial Data Retention Defaults

INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES 
('retention_days_hi_res', '14', CURRENT_TIMESTAMP),
('retention_days_tiered', '60', CURRENT_TIMESTAMP),
('retention_days_audit', '90', CURRENT_TIMESTAMP),
('retention_cloud_sync_required', 'true', CURRENT_TIMESTAMP),
('retention_fulfillment_lock', 'true', CURRENT_TIMESTAMP);
