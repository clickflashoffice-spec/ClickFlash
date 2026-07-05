-- Migration 071: Add pairings table for Touch kiosk registration
CREATE TABLE IF NOT EXISTS pairings (
  kiosk_id      TEXT PRIMARY KEY,
  mac           TEXT,
  ip            TEXT,
  hmac_secret   TEXT NOT NULL,
  tenant_id     TEXT,
  paired_at     INTEGER NOT NULL,
  last_seen     INTEGER
);

CREATE INDEX IF NOT EXISTS idx_pairings_last_seen ON pairings(last_seen);
