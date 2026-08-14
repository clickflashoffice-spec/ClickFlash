-- Mobile Photographer -> Master authenticated capture ingest.

CREATE TABLE IF NOT EXISTS mobile_capture_devices (
  device_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  hmac_secret TEXT NOT NULL,
  master_id TEXT NOT NULL,
  paired_at INTEGER NOT NULL,
  last_seen_at INTEGER,
  revoked_at INTEGER
);

CREATE TABLE IF NOT EXISTS mobile_capture_request_nonces (
  device_id TEXT NOT NULL,
  nonce TEXT NOT NULL,
  seen_at INTEGER NOT NULL,
  PRIMARY KEY (device_id, nonce),
  FOREIGN KEY (device_id) REFERENCES mobile_capture_devices(device_id)
);

CREATE INDEX IF NOT EXISTS mobile_capture_request_nonces_seen
  ON mobile_capture_request_nonces(seen_at);

CREATE TABLE IF NOT EXISTS mobile_capture_uploads (
  idempotency_key TEXT PRIMARY KEY,
  remote_receipt_id TEXT NOT NULL UNIQUE,
  device_id TEXT NOT NULL,
  asset_role TEXT NOT NULL CHECK (asset_role IN ('ORIGINAL', 'QUICK_EDIT')),
  asset_sha256 TEXT NOT NULL CHECK (length(asset_sha256) = 64),
  asset_byte_size INTEGER NOT NULL CHECK (asset_byte_size > 0),
  original_filename TEXT NOT NULL,
  temp_path TEXT NOT NULL,
  final_path TEXT,
  bytes_received INTEGER NOT NULL DEFAULT 0
    CHECK (bytes_received >= 0 AND bytes_received <= asset_byte_size),
  state TEXT NOT NULL CHECK (state IN ('RECEIVING', 'VERIFYING', 'READY', 'FAILED_REVIEW')),
  receipt_json TEXT,
  receipt_signature TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  ready_at INTEGER,
  FOREIGN KEY (device_id) REFERENCES mobile_capture_devices(device_id)
);

CREATE INDEX IF NOT EXISTS mobile_capture_uploads_device_state
  ON mobile_capture_uploads(device_id, state, updated_at);

CREATE TABLE IF NOT EXISTS mobile_capture_processing_queue (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  asset_sha256 TEXT NOT NULL,
  local_path TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('PENDING', 'PROCESSING', 'DONE', 'FAILED_REVIEW')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (idempotency_key) REFERENCES mobile_capture_uploads(idempotency_key)
);
