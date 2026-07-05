-- Phase 34: Add signingSecret to kiosks table
-- This secret is used for HMAC-SHA256 request signing for all LAN-exposed routes.
-- Attempt to add column
ALTER TABLE kiosks
ADD COLUMN signingSecret TEXT;
-- Index for lookup optimization
CREATE INDEX IF NOT EXISTS idx_kiosks_signingSecret ON kiosks(signingSecret);