-- Add source column to orders table to track order origin (kiosk or manual)
ALTER TABLE orders ADD COLUMN source TEXT DEFAULT 'manual';
-- Update existing orders: if order ID starts with 'KIOSK-', set source to 'kiosk'
UPDATE orders SET source = 'kiosk' WHERE id LIKE 'KIOSK-%';

