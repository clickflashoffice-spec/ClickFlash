-- SQLite compatible Gallery Orders (Standardized CamelCase)
CREATE TABLE IF NOT EXISTS gallery_orders (
    id TEXT PRIMARY KEY,
    tokenId TEXT,
    customerEmail TEXT NOT NULL,
    items TEXT NOT NULL,
    -- Store JSON as string
    total REAL NOT NULL,
    stripeSessionId TEXT UNIQUE,
    stripePaymentId TEXT,
    status TEXT DEFAULT 'pending',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gallery_orders_token ON gallery_orders(tokenId);
CREATE INDEX IF NOT EXISTS idx_gallery_orders_stripe_session ON gallery_orders(stripeSessionId);
CREATE INDEX IF NOT EXISTS idx_gallery_orders_status ON gallery_orders(status);
CREATE INDEX IF NOT EXISTS idx_gallery_orders_email ON gallery_orders(customerEmail);