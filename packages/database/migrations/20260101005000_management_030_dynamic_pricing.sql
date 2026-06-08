-- Migration: Dynamic pricing tables for management hub
-- Date: 2026-05-18

-- Enhance products table with status, description, tier
ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'Active';
ALTER TABLE products ADD COLUMN description TEXT;
ALTER TABLE products ADD COLUMN tier TEXT DEFAULT 'standard';

-- Per-hotel price overrides
CREATE TABLE IF NOT EXISTS IF NOT EXISTS pricing_overrides (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    hotel_id TEXT NOT NULL,
    price REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(product_id, hotel_id)
);

CREATE INDEX idx_pricing_overrides_hotel ON pricing_overrides(hotel_id);
CREATE INDEX idx_pricing_overrides_product ON pricing_overrides(product_id);

-- Seasonal rate multipliers
CREATE TABLE IF NOT EXISTS IF NOT EXISTS seasonal_rates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    hotel_id TEXT,
    multiplier REAL NOT NULL DEFAULT 1.0,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_seasonal_rates_dates ON seasonal_rates(start_date, end_date);
CREATE INDEX idx_seasonal_rates_hotel ON seasonal_rates(hotel_id);

-- Insert migration record
INSERT INTO migrations (version, applied_at) VALUES (30, datetime('now'));
