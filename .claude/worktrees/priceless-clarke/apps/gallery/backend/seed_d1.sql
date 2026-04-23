-- Update existing user or insert seed data for Gallery D1

-- Update existing test user
UPDATE users SET email = 'admin@clickflash.com', name = 'Admin User', role = 'admin', password = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4aYp1pD3qIa6qCq6' WHERE id = 1;

-- Albums
INSERT OR IGNORE INTO albums (id, title, date, status, pricePerPhoto, fullGalleryPrice, access_code, created_at, updated_at) VALUES
('gal_001', 'Marhaba Summer 2026', '2026-03-15', 'Finalized', 15.00, 99.00, 'MARHABA2026', datetime('now'), datetime('now')),
('gal_002', 'Occidental Beach Day', '2026-03-10', 'Finalized', 12.00, 79.00, 'OCCBEACH01', datetime('now'), datetime('now'));

-- Products
INSERT OR IGNORE INTO products (id, name, category, price, stock, isFeatured, status, created_at, updated_at) VALUES
('gprod_single', 'Single Photo Download', 'digital', 15.00, 999, 0, 'Active', datetime('now'), datetime('now')),
('gprod_pack5', '5 Photo Package', 'digital', 59.00, 500, 1, 'Active', datetime('now'), datetime('now'));

-- Access codes
INSERT OR IGNORE INTO access_codes (id, code, album_id, is_active, created_at) VALUES
('ac_001', 'MARHABA2026', 'gal_001', 1, datetime('now')),
('ac_002', 'OCCBEACH01', 'gal_002', 1, datetime('now'));

-- Portfolio Items
INSERT OR IGNORE INTO portfolio_items (id, image_url, thumbnail_url, title, category, display_order, active, created_at) VALUES
(1, 'https://picsum.photos/seed/gal1/800/600', 'https://picsum.photos/seed/gal1/400/300', 'Sunset Beach Portrait', 'Fashion', 1, 1, datetime('now')),
(2, 'https://picsum.photos/seed/gal2/800/600', 'https://picsum.photos/seed/gal2/400/300', 'Couple Romance', 'Couples', 2, 1, datetime('now'));

-- Gallery settings
INSERT OR IGNORE INTO gallery_settings (id, key, value, category, is_public, created_at, updated_at) VALUES
('gset_brand', 'brand_name', 'ClickFlash Gallery', 'branding', 1, datetime('now'), datetime('now'));
