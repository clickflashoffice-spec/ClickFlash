-- Add source column to orders table to track order origin (kiosk or manual)
ALTER TABLE orders ADD COLUMN source TEXT DEFAULT 'kiosk';
-- All orders in touch kiosk are from kiosk
UPDATE orders SET source = 'kiosk' WHERE source IS NULL;

