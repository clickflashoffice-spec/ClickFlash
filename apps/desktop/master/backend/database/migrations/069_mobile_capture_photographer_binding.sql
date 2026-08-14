-- Bind each paired Android device to an administrator-selected photographer.
-- The mobile client never selects or submits this identity.

ALTER TABLE mobile_capture_devices ADD COLUMN photographer_id TEXT;

CREATE INDEX IF NOT EXISTS mobile_capture_devices_photographer
  ON mobile_capture_devices(photographer_id, revoked_at);
