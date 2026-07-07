-- Migration V1: Add missing columns to Hub D1 Database
-- Resolve CloudSync 500 and Hub 1101 Initialization/Schema Errors

-- 1. Fix 'orders' table
ALTER TABLE orders ADD COLUMN email TEXT;
ALTER TABLE orders ADD COLUMN paymentMethod TEXT;
ALTER TABLE orders ADD COLUMN access_pin TEXT;
ALTER TABLE orders ADD COLUMN magic_link_token TEXT;

-- 2. Fix 'users' table
ALTER TABLE users ADD COLUMN specialty TEXT;
ALTER TABLE users ADD COLUMN avatarUrl TEXT;
ALTER TABLE users ADD COLUMN destinationId TEXT;
ALTER TABLE users ADD COLUMN workingHours JSON;
ALTER TABLE users ADD COLUMN desk_id TEXT;

-- 3. Create missing tables (from schema.sql audit)
CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_users_desk_id ON users(desk_id);
