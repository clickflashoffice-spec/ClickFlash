-- backend/migrations/067_proactive_maintenance.sql
-- Rule 20: Persistent tracking for database optimization cycles

INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('last_reindex', 'never', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('last_analyze', 'never', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('last_face_cleanup', 'never', CURRENT_TIMESTAMP);
