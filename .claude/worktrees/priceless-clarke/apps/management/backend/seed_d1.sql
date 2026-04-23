-- Seed data for Management Hub D1 (minimal)

-- Users
INSERT INTO users (name, email, password, role, specialty, status, created_at, updated_at) VALUES
('Admin User', 'admin@clickflash.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4aYp1pD3qIa6qCq6', 'Admin', NULL, 'Active', datetime('now'), datetime('now')),
('John Photographer', 'john@clickflash.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4aYp1pD3qIa6qCq6', 'Photographer', 'Portrait', 'Active', datetime('now'), datetime('now'));

-- Sites
INSERT INTO sites (id, name, type, country, created_at, updated_at) VALUES
('site_marrakech', 'Marhaba Marrakech', 'resort', 'Morocco', datetime('now'), datetime('now'));

-- Desks
INSERT INTO desks (id, name, location, site_id, status, last_seen, created_at, updated_at) VALUES
('desk_001', 'Desk 1 - Pool Area', 'Pool Area', 'site_marrakech', 'online', datetime('now'), datetime('now'), datetime('now'));

-- Destinations
INSERT INTO destinations (id, name, country, type, status, created_at) VALUES
('dest_001', 'Marhaba Beach Resort', 'Morocco', 'resort', 'Active', datetime('now'));

-- Albums
INSERT INTO albums (id, title, date, status, pricePerPhoto, fullGalleryPrice, desk_id, created_at, updated_at) VALUES
('album_001', 'Summer Vacation Collection', '2026-03-15', 'Finalized', 15.00, 99.00, 'desk_001', datetime('now'), datetime('now'));

-- Products
INSERT INTO products (id, name, category, price, stock, isFeatured, status, created_at, updated_at) VALUES
('prod_photo', 'Single Photo', 'prints', 15.00, 1000, 0, 'Active', datetime('now'), datetime('now')),
('prod_package5', '5 Photo Package', 'packages', 59.00, 500, 1, 'Active', datetime('now'), datetime('now'));

-- Portfolio Items
INSERT INTO portfolio_items (image_url, thumbnail_url, title, category, display_order, active, created_at) VALUES
('https://picsum.photos/seed/cf1/800/600', 'https://picsum.photos/seed/cf1/400/300', 'Sunset Beach Portrait', 'Fashion', 1, 1, datetime('now')),
('https://picsum.photos/seed/cf2/800/600', 'https://picsum.photos/seed/cf2/400/300', 'Couple Romance', 'Couples', 2, 1, datetime('now'));

-- Settings
INSERT INTO settings (id, key, value, created_at, updated_at) VALUES
('set_currency', 'currency', 'USD', datetime('now'), datetime('now'));
