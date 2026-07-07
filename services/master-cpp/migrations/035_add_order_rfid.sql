-- Add rfidTag column for guest wristband binding (Phase 29)
ALTER TABLE orders
ADD COLUMN rfidTag TEXT;
CREATE INDEX idx_orders_rfid ON orders(rfidTag);