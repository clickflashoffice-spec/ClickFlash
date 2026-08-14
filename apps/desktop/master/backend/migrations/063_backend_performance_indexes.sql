-- Backend Performance Indexes — Local Backend Schema Indexes
-- Phase 2.1: Critical high-volume query indexes for columns added in backend migrations (001-062).

-- Photos: fast album-scoped filtering by active/archived status across gallery, fulfillment, and reels
CREATE INDEX IF NOT EXISTS idx_photos_album_status ON photos(albumId, status);

-- Photos: GDPR compliance queries and consent tracking sweeps (gdprService.ts)
CREATE INDEX IF NOT EXISTS idx_photos_consent_status ON photos(consent_status);

-- Orders: fast lookup for pending or failed cloud sync orders by status (cloudSyncService.ts)
CREATE INDEX IF NOT EXISTS idx_orders_status_cloud_sync ON orders(status, cloud_sync_status);

-- Orders: GDPR consent queries and updates (gdprService.ts)
CREATE INDEX IF NOT EXISTS idx_orders_gdpr_consent ON orders(gdpr_consent);
