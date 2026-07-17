-- Dedicated, server-priced MoneyTrash B2B checkout state.
ALTER TABLE orders ADD COLUMN gallery_id TEXT REFERENCES galleries(id);
ALTER TABLE orders ADD COLUMN client_session_id TEXT;
ALTER TABLE orders ADD COLUMN cart_fingerprint TEXT;
ALTER TABLE orders ADD COLUMN stripe_checkout_session_id TEXT;
ALTER TABLE orders ADD COLUMN stripe_checkout_url TEXT;
ALTER TABLE orders ADD COLUMN stripe_payment_status TEXT;
ALTER TABLE orders ADD COLUMN stats_recorded_at TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_gallery_id ON orders(gallery_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_gallery_client_session
    ON orders(gallery_id, client_session_id)
    WHERE gallery_id IS NOT NULL AND client_session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_checkout_session
    ON orders(stripe_checkout_session_id)
    WHERE stripe_checkout_session_id IS NOT NULL;
