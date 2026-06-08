-- Definitive Schema Repair for orders table
ALTER TABLE orders RENAME TO orders_old;

CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    date TEXT,
    clientName TEXT,
    email TEXT,
    customerEmail TEXT,
    status TEXT,
    fulfillment_status TEXT,
    total REAL,
    totalAmount REAL,
    photographerId TEXT,
    destinationId TEXT,
    paymentMethod TEXT,
    appliedDiscount REAL,
    items TEXT,
    albumId TEXT,
    desk_id TEXT,
    original_id TEXT,
    access_pin TEXT,
    magic_link_token TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Migrating existing data (mapping known columns)
INSERT INTO orders (
    id, date, clientName, email, status, fulfillment_status, total, totalAmount, 
    photographerId, destinationId, items, albumId, desk_id, original_id, 
    updated_at, created_at
)
SELECT 
    id, date, clientName, email, status, fulfillment_status, total, totalAmount, 
    photographerId, destinationId, items, albumId, desk_id, original_id, 
    updated_at, created_at
FROM orders_old;

-- Optional: Create indexes
CREATE INDEX idx_orders_email ON orders(email);
CREATE INDEX idx_orders_desk_id ON orders(desk_id);
CREATE INDEX idx_orders_magic_token ON orders(magic_link_token);

-- Drop old table
DROP TABLE orders_old;
