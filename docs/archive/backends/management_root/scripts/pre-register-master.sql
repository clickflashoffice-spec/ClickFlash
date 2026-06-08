-- ClickFlash Management Hub - Master App Pre-registration
-- This script prepares the Hub database to accept connections and syncs from Master stations.

-- 1. Create Destinations (Master Stations)
-- TN001-MO: Marhaba Occidental
-- TN002-MC: Marhaba Club
-- TN003-CGP: Concorde Green Park

-- Site TN001
INSERT OR REPLACE INTO destinations (id, name, country, site_code, type, status, last_seen, version)
VALUES ('TN001-MO', 'Marhaba Occidental Sousse', 'TUN', 'TN001', 'Master', 'Offline', CURRENT_TIMESTAMP, '4.2.0');

-- Site TN002
INSERT OR REPLACE INTO destinations (id, name, country, site_code, type, status, last_seen, version)
VALUES ('TN002-MC', 'Marhaba Club Sousse', 'TUN', 'TN002', 'Master', 'Offline', CURRENT_TIMESTAMP, '4.2.0');

-- Site TN003
INSERT OR REPLACE INTO destinations (id, name, country, site_code, type, status, last_seen, version)
VALUES ('TN003-CGP', 'Concorde Green Park Palace', 'TUN', 'TN003', 'Master', 'Offline', CURRENT_TIMESTAMP, '4.2.0');

-- 2. Create Master Registration (Auth Users)
-- Note: passwords are set to 'clickflash2026' - hash: $2b$12$Z0H7kM7lIuR.t/K4/bUvZeXf5A5A5A5A5A5A5A5A5A5A5A5A5A5A5 (Dummy for now, will be reset on site)
-- Site 1 User
INSERT OR REPLACE INTO users (email, name, password, role, status, desk_id, machine_id, created_at, updated_at)
VALUES ('mo@clickflash.photo', 'MO Master station', '$2b$12$Q5peTCgr5m35GlZX/6Df.OY00Wq.xJD.otjDpKYcJbANrLvTSqWQa', 'photographer', 'active', 'TN001-MO', 'site_mo_hw_001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Site 2 User
INSERT OR REPLACE INTO users (email, name, password, role, status, desk_id, machine_id, created_at, updated_at)
VALUES ('mc@clickflash.photo', 'MC Master station', '$2b$12$Q5peTCgr5m35GlZX/6Df.OY00Wq.xJD.otjDpKYcJbANrLvTSqWQa', 'photographer', 'active', 'TN002-MC', 'site_mc_hw_001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Site 3 User
INSERT OR REPLACE INTO users (email, name, password, role, status, desk_id, machine_id, created_at, updated_at)
VALUES ('cgp@clickflash.photo', 'CGP Master station', '$2b$12$Q5peTCgr5m35GlZX/6Df.OY00Wq.xJD.otjDpKYcJbANrLvTSqWQa', 'photographer', 'active', 'TN003-CGP', 'site_cgp_hw_001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 3. Initialize Sync Sequences
INSERT OR REPLACE INTO sync_sequences (id, site_id, counter, updated_at) VALUES ('SEQ_TN001-MO', 'TN001-MO', 0, CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO sync_sequences (id, site_id, counter, updated_at) VALUES ('SEQ_TN002-MC', 'TN002-MC', 0, CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO sync_sequences (id, site_id, counter, updated_at) VALUES ('SEQ_TN003-CGP', 'TN003-CGP', 0, CURRENT_TIMESTAMP);

-- 4. Initial Global Settings
INSERT OR REPLACE INTO settings (key, value, created_at, updated_at) VALUES ('moneytrash_settings_TN001-MO', '{"enabled": true, "retentionDays": 7, "price": "20.00"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO settings (key, value, created_at, updated_at) VALUES ('moneytrash_settings_TN002-MC', '{"enabled": true, "retentionDays": 7, "price": "20.00"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO settings (key, value, created_at, updated_at) VALUES ('moneytrash_settings_TN003-CGP', '{"enabled": true, "retentionDays": 7, "price": "25.00"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
