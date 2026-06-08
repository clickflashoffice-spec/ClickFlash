-- Migration 022: Login attempt tracking for auth brute-force protection

CREATE TABLE IF NOT EXISTS IF NOT EXISTS login_attempts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT    NOT NULL,
  ip          TEXT    NOT NULL DEFAULT 'unknown',
  success     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mgmt_login_attempts_email_time
  ON login_attempts (email, created_at);

CREATE INDEX IF NOT EXISTS idx_mgmt_login_attempts_ip_time
  ON login_attempts (ip, created_at);

CREATE TRIGGER IF NOT EXISTS trg_purge_old_mgmt_login_attempts
AFTER INSERT ON login_attempts
BEGIN
  DELETE FROM login_attempts
  WHERE created_at < datetime('now', '-1 hour');
END;
