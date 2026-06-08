-- 1. Fix Settings Table (Idempotent: Drop is safe)
DROP TABLE IF EXISTS settings;
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- STRATEGY: Always run ADD COLUMN statements.
-- db.ts migration runner silently ignores "duplicate column name" errors,
-- so these are safe on existing DBs (columns already present) AND required
-- on fresh installs (columns not yet present).

-- 2. Update Kiosks Table
ALTER TABLE kiosks ADD COLUMN lastHeartbeat DATETIME;
ALTER TABLE kiosks ADD COLUMN created_at DATETIME;
ALTER TABLE kiosks ADD COLUMN updated_at DATETIME;

-- 3. Update Products Table
ALTER TABLE products ADD COLUMN created_at DATETIME;
ALTER TABLE products ADD COLUMN updated_at DATETIME;

-- 4. Add updated_at to existing tables
ALTER TABLE users ADD COLUMN updated_at DATETIME;
ALTER TABLE albums ADD COLUMN updated_at DATETIME;
ALTER TABLE photos ADD COLUMN updated_at DATETIME;
ALTER TABLE orders ADD COLUMN updated_at DATETIME;

-- 5. Add missing columns referenced in code/whitelist
ALTER TABLE albums ADD COLUMN eventType TEXT;

