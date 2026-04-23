-- Pre-register test station for alignment verification
-- Site ID: desk_test_alignment
-- Location: Tunisia Alignment Lab

-- Destinations table stores Master sites in this Hub
INSERT OR IGNORE INTO destinations (id, name, country, site_code, type, status) 
VALUES ('dest_tunisia_lab', 'Tunisia Alignment Lab', 'Tunisia', 'desk_test_alignment', 'Master', 'active');

-- Kiosks table stores child kiosks of this node (if needed)
INSERT OR IGNORE INTO kiosks (id, name, status)
VALUES ('kiosk_test_alignment', 'Station Alpha (Test)', 'Active');

-- Global settings for sync
INSERT OR IGNORE INTO settings (id, key, value)
VALUES ('sett_sync_mode', 'global_sync_frequency', '"60"');
