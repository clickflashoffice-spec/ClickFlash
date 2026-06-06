-- Migration 012: Login attempt tracking for auth brute-force protection
-- Used by loginRateLimiter.ts to enforce per-email lockout in the Worker.

CREATE TABLE IF NOT EXISTS login_attempts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT    NOT NULL,
  ip          TEXT    NOT NULL DEFAULT 'unknown',
  success     INTEGER NOT NULL DEFAULT 0,  -- 0 = failed, 1 = success
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Index for fast per-email lookups within a time window
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON login_attempts (email, created_at);

-- Index for per-IP lookups
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time
  ON login_attempts (ip, created_at);

-- Auto-purge entries older than 1 hour on INSERT via a trigger to keep the table lean.
-- (D1 has no background jobs; a trigger is the lightest option.)
CREATE TRIGGER IF NOT EXISTS trg_purge_old_login_attempts
AFTER INSERT ON login_attempts
BEGIN
  DELETE FROM login_attempts
  WHERE created_at < datetime('now', '-1 hour');
END;
