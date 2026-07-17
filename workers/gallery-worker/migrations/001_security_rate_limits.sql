CREATE TABLE IF NOT EXISTS rate_limit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  ts TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_lookup
  ON rate_limit_events (ip, endpoint, ts);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_timestamp
  ON rate_limit_events (ts);

CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  ip TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON login_attempts (email, created_at);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time
  ON login_attempts (ip, created_at);
