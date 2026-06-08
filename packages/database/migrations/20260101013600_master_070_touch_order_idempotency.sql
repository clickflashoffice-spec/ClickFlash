-- Migration 070: Touch Order Idempotency
-- Adds clientMutationId to orders for deduplication across kiosk -> master sync.

ALTER TABLE orders ADD COLUMN client_mutation_id TEXT;
ALTER TABLE orders ADD COLUMN client_device_id TEXT;
ALTER TABLE orders ADD COLUMN mutation_timestamp INTEGER;

CREATE INDEX IF NOT EXISTS idx_orders_client_mutation ON orders(client_mutation_id);
CREATE INDEX IF NOT EXISTS idx_orders_client_device ON orders(client_device_id);
