-- Website-facing state used by the Gallery worker's public compatibility API.
-- This migration belongs to WEBSITE_DB, not GALLERY_DB. The binding-specific
-- migrations_dir entries in wrangler.toml keep the two D1 histories separate.

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  ts TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_website_rate_limit_lookup
  ON rate_limit_events (ip, endpoint, ts);

CREATE INDEX IF NOT EXISTS idx_website_rate_limit_timestamp
  ON rate_limit_events (ts);

CREATE TABLE IF NOT EXISTS contact_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  service TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_created
  ON contact_submissions (created_at);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_status
  ON contact_submissions (status, created_at);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  service_type TEXT,
  event_date TEXT,
  event_location TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_website_bookings_created
  ON bookings (created_at);

CREATE INDEX IF NOT EXISTS idx_website_bookings_status
  ON bookings (status, event_date);

-- Compatibility columns preserve existing content while the public Website
-- contract is consolidated under the Gallery worker.
CREATE TABLE IF NOT EXISTS portfolio_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  is_featured INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_website_portfolio_listing
  ON portfolio_items (active, category, sort_order, created_at);

CREATE TABLE IF NOT EXISTS access_codes (
  code TEXT PRIMARY KEY,
  album_id TEXT,
  redirect_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_website_access_codes_active
  ON access_codes (is_active, expires_at);
