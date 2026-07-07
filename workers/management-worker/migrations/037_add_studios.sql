-- 037_add_studios.sql
-- Schema for Phase 7: Business Logic & Monetization V2 (Tenant Provisioning)

CREATE TABLE IF NOT EXISTS studios (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT,
    subscription_status TEXT DEFAULT 'incomplete',
    billing_tier TEXT DEFAULT 'Free',
    photos_this_month INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_studios_stripe_customer ON studios(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_studios_email ON studios(email);

-- Link destinations to studios (a destination belongs to a studio tenant)
ALTER TABLE destinations ADD COLUMN studio_id TEXT REFERENCES studios(id);
CREATE INDEX IF NOT EXISTS idx_destinations_studio ON destinations(studio_id);
