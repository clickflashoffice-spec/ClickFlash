-- Migration 068: Admin PIN Security
-- Initializes hashed admin PIN for the settings table.
-- Default hash corresponds to '1234'

INSERT OR IGNORE INTO settings (key, value) 
VALUES ('admin_pin_hash', '$2a$10$IDu6AjAu1BpqTXuTxjDdaOoalzipCNkBoRHgbAv7R2qaePmbTvea2');
