-- Scalability Indexes for 100GB+ Libraries (Rule 15)
-- Optimized for large album and photographer datasets
-- Index photographerId on albums table
CREATE INDEX IF NOT EXISTS idx_albums_photographerId ON albums(photographerId);
-- Index photographerId on photos table
CREATE INDEX IF NOT EXISTS idx_photos_photographerId ON photos(photographerId);
-- Index photographerId on orders table
CREATE INDEX IF NOT EXISTS idx_orders_photographerId ON orders(photographerId);
-- Index clientEmail on orders for faster customer lookups
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
