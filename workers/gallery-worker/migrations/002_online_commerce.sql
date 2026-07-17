CREATE TABLE IF NOT EXISTS abandoned_carts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  album_id TEXT,
  items TEXT NOT NULL,
  total REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'eur',
  session_id TEXT NOT NULL UNIQUE,
  recovered INTEGER NOT NULL DEFAULT 0,
  recovery_sent INTEGER NOT NULL DEFAULT 0,
  recovered_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_recovery
  ON abandoned_carts (recovered, recovery_sent, updated_at);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_email
  ON abandoned_carts (email);

CREATE TABLE IF NOT EXISTS webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  processed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_created
  ON webhook_events (created_at);
