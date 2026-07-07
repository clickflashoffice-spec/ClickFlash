-- Performance Indexes v4 — Additional photographer indexes
-- Audit P3: Addressing missing indexes for photographer queries

-- Albums: fast lookup for a specific photographer
CREATE INDEX IF NOT EXISTS idx_albums_photographerId ON albums(photographerId);

-- Photos: fast lookup for face index processing
CREATE INDEX IF NOT EXISTS idx_photos_status_created_at ON photos(status, created_at) WHERE status IS NOT NULL;

-- Orders: fast lookup by photographerId
CREATE INDEX IF NOT EXISTS idx_orders_photographerId ON orders(photographerId);
