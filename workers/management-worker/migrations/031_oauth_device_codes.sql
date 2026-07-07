-- Migration 031: OAuth Device Code Grant + Durable Audit Events
-- Date: 2026-06-12
-- Implements RFC 8628 device authorization flow for the 1-click installer.
-- Replaces the in-memory auditService with a D1-backed table.

-- ============================================================================
-- PART 1: OAuth Device Codes (RFC 8628)
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_codes (
  -- Long device code (opaque, sent in X-Device-Code header). Single-use, secret.
  device_code  TEXT PRIMARY KEY,
  -- Short human-readable code shown to user (e.g. "ABCD-1234"). NOT secret — leaked OK.
  user_code    TEXT UNIQUE NOT NULL,
  -- Tenant the device will be bound to once admin approves.
  -- NULL until /api/v1/oauth/authorize completes.
  tenant_id    TEXT,
  -- Admin user who authorized the device (for audit + rate limit).
  admin_user_id TEXT,
  -- When the code expires. 10 minutes from creation.
  expires_at   INTEGER NOT NULL,
  -- 0 = pending, 1 = authorized (admin typed the code and picked a tenant).
  authorized   INTEGER NOT NULL DEFAULT 0,
  -- 0 = not used, 1 = exchanged for a token (single-use).
  exchanged    INTEGER NOT NULL DEFAULT 0,
  -- Scope requested (e.g. "fleet:write cloud:sync").
  scope        TEXT NOT NULL DEFAULT 'fleet:write',
  -- Client app identifier (we only accept "clickflash-installer" today).
  client_id    TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  authorized_at INTEGER,
  exchanged_at  INTEGER
);

-- Fast lookup by user code (when admin types it in the web UI).
CREATE INDEX IF NOT EXISTS idx_oauth_codes_user_code ON oauth_codes(user_code);
-- Fast expiry sweep (cron job removes expired every 60s).
CREATE INDEX IF NOT EXISTS idx_oauth_codes_expires ON oauth_codes(expires_at) WHERE exchanged = 0;
-- Tenant audit trail.
CREATE INDEX IF NOT EXISTS idx_oauth_codes_tenant ON oauth_codes(tenant_id, created_at DESC);

-- ============================================================================
-- PART 2: Durable Audit Events (replaces in-memory auditService)
-- ============================================================================
-- Distinction from daily_photographer_audits (which is BI data, retention 365d):
-- audit_events is the COMPLIANCE log (retention 2y, GDPR Art. 32 traceability).

CREATE TABLE IF NOT EXISTS audit_events (
  id           TEXT PRIMARY KEY,                      -- UUID v4
  tenant_id    TEXT NOT NULL,
  desk_id      TEXT,                                   -- NULL for hub-internal events
  actor        TEXT NOT NULL,                          -- 'installer' | 'master' | 'admin' | 'kiosk' | 'webhook'
  actor_id     TEXT,                                   -- user_id / desk_id / IP-hash
  action       TEXT NOT NULL,                          -- 'register' | 'heartbeat' | 'pair' | 'order.created' | 'payout' | 'license.validate' | 'oauth.authorize' | 'oauth.exchange'
  target       TEXT,                                   -- resource id (album_id, order_id, kiosk_id)
  payload_json TEXT,                                   -- full event body, JSON
  ip           TEXT,                                   -- request IP (CF-Connecting-IP)
  user_agent   TEXT,
  ts           INTEGER NOT NULL,                       -- epoch seconds
  INDEX idx_audit_tenant_ts (tenant_id, ts DESC),
  INDEX idx_audit_desk_ts (desk_id, ts DESC) WHERE desk_id IS NOT NULL,
  INDEX idx_audit_action_ts (action, ts DESC)
);

-- ============================================================================
-- PART 3: License Keys (needed for /api/v1/license/validate)
-- ============================================================================
-- Existing /api/auth/login is for admins. The installer needs to validate
-- a license key at the very first step. A license key is *not* an admin login —
-- it doesn't grant admin scope, it just identifies which tenant this install
-- will be bound to and which features are available.

CREATE TABLE IF NOT EXISTS license_keys (
  id            TEXT PRIMARY KEY,                      -- "lic_<uuid>"
  tenant_id     TEXT NOT NULL,
  -- The key itself, hashed (bcrypt). We never store plaintext.
  key_hash      TEXT NOT NULL UNIQUE,
  -- Last 4 characters of the key, for human display in the admin dashboard.
  key_last4     TEXT NOT NULL,
  plan          TEXT NOT NULL DEFAULT 'standard',      -- 'standard' | 'enterprise' | 'trial'
  features_json TEXT NOT NULL DEFAULT '[]',            -- JSON array of feature flags
  max_masters   INTEGER NOT NULL DEFAULT 1,
  region        TEXT,                                  -- 'ap-southeast' | 'eu' | 'us' | NULL = global
  is_active     INTEGER NOT NULL DEFAULT 1,
  expires_at    INTEGER,                               -- NULL = never
  created_at    INTEGER NOT NULL,
  activated_at  INTEGER,
  last_used_at  INTEGER,
  -- Count of how many times this key has been used to validate.
  -- After first successful use, the key is bound to a specific desk_id.
  use_count     INTEGER NOT NULL DEFAULT 0,
  bound_desk_id TEXT                                   -- NULL until first /register
);

CREATE INDEX IF NOT EXISTS idx_license_tenant ON license_keys(tenant_id) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_license_active ON license_keys(is_active) WHERE is_active = 1;

-- ============================================================================
-- PART 4: Pending admin notifications (OAuth authorize web UI)
-- ============================================================================
-- When an admin loads the activate page with ?code=ABCD-1234, we look up the
-- device and the admin. This is just a thin "what's pending" view.
-- Real-time UX: poll this table or use Cloudflare Durable Objects.
-- For now: 5-second polling from the web UI.

-- (No new table needed; oauth_codes already has the state.)

-- ============================================================================
-- PART 5: Migration record
-- ============================================================================

INSERT INTO migrations (version, applied_at) VALUES (31, datetime('now'));
