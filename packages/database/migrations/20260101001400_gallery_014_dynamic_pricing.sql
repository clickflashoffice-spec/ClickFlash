-- Migration: Dynamic pricing rules — per-hotel tiers and seasonal rates
-- Date: 2026-05-18

-- Enhance products table with status and tier support
ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'Active';
ALTER TABLE products ADD COLUMN description TEXT;
ALTER TABLE products ADD COLUMN tier TEXT DEFAULT 'standard'; -- standard, premium, luxury

-- Per-hotel price overrides: a hotel can charge differently for the same product
CREATE TABLE IF NOT EXISTS pricing_overrides (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    hotel_id TEXT NOT NULL,          -- references destinations.id
    price REAL NOT NULL,             -- override price for this hotel
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(product_id, hotel_id)
);

CREATE INDEX idx_pricing_overrides_hotel ON pricing_overrides(hotel_id);
CREATE INDEX idx_pricing_overrides_product ON pricing_overrides(product_id);

-- Seasonal rate multipliers: apply % adjustments for date ranges
CREATE TABLE IF NOT EXISTS seasonal_rates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,               -- e.g. "Summer Peak 2026", "Off-season"
    hotel_id TEXT,                    -- NULL = applies to all hotels
    multiplier REAL NOT NULL DEFAULT 1.0, -- 1.2 = +20%, 0.8 = -20%
    start_date TEXT NOT NULL,         -- ISO date YYYY-MM-DD
    end_date TEXT NOT NULL,           -- ISO date YYYY-MM-DD
    priority INTEGER DEFAULT 0,       -- higher priority wins on overlap
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_seasonal_rates_dates ON seasonal_rates(start_date, end_date);
CREATE INDEX idx_seasonal_rates_hotel ON seasonal_rates(hotel_id);

-- Insert migration record
INSERT INTO migrations (version, applied_at) VALUES (14, datetime('now'));
