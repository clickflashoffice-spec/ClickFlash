-- MoneyTrash Cloudflare D1 Database Schema
-- Run with: wrangler d1 execute moneytrash-db --file=schema/schema.sql

-- Offices table (MoneyTrash stations/offices)
CREATE TABLE IF NOT EXISTS offices (
    id TEXT PRIMARY KEY,
    desk_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'moneytrash',
    location TEXT,
    contact_email TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    api_secret TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    settings TEXT, -- JSON
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_seen_at TEXT
);

-- Create index on desk_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_offices_desk_id ON offices(desk_id);
CREATE INDEX IF NOT EXISTS idx_offices_api_key ON offices(api_key);
CREATE INDEX IF NOT EXISTS idx_offices_status ON offices(status);

-- Galleries table
CREATE TABLE IF NOT EXISTS galleries (
    id TEXT PRIMARY KEY,
    office_id TEXT NOT NULL,
    access_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    cover_image TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    purchase_count INTEGER DEFAULT 0,
    revenue REAL DEFAULT 0,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (office_id) REFERENCES offices(id)
);

-- Indexes for galleries
CREATE INDEX IF NOT EXISTS idx_galleries_access_code ON galleries(access_code);
CREATE INDEX IF NOT EXISTS idx_galleries_office_id ON galleries(office_id);
CREATE INDEX IF NOT EXISTS idx_galleries_status ON galleries(status);
CREATE INDEX IF NOT EXISTS idx_galleries_expires_at ON galleries(expires_at);

-- Gallery settings table
CREATE TABLE IF NOT EXISTS gallery_settings (
    gallery_id TEXT PRIMARY KEY,
    single_photo_price REAL,
    full_gallery_price REAL,
    watermark_enabled INTEGER DEFAULT 0,
    watermark_opacity REAL DEFAULT 0.5,
    allow_downloads INTEGER DEFAULT 0,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE
);

-- Assets table (uploaded photos)
CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    gallery_id TEXT,
    order_id TEXT,
    office_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    r2_key TEXT NOT NULL,
    preview_key TEXT,
    thumbnail_key TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    delivered_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (office_id) REFERENCES offices(id)
);

-- Indexes for assets
CREATE INDEX IF NOT EXISTS idx_assets_gallery_id ON assets(gallery_id);
CREATE INDEX IF NOT EXISTS idx_assets_order_id ON assets(order_id);
CREATE INDEX IF NOT EXISTS idx_assets_office_id ON assets(office_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    office_id TEXT NOT NULL,
    access_code TEXT,
    customer_email TEXT,
    customer_name TEXT,
    total_amount REAL,
    currency TEXT DEFAULT 'EUR',
    status TEXT NOT NULL DEFAULT 'pending',
    stripe_payment_intent_id TEXT,
    gallery_id TEXT,
    client_session_id TEXT,
    cart_fingerprint TEXT,
    stripe_checkout_session_id TEXT,
    stripe_checkout_url TEXT,
    stripe_payment_status TEXT,
    stats_recorded_at TEXT,
    paid_at TEXT,
    fulfilled_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (office_id) REFERENCES offices(id),
    FOREIGN KEY (gallery_id) REFERENCES galleries(id)
);

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_access_code ON orders(access_code);
CREATE INDEX IF NOT EXISTS idx_orders_office_id ON orders(office_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_gallery_id ON orders(gallery_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_gallery_client_session
    ON orders(gallery_id, client_session_id)
    WHERE gallery_id IS NOT NULL AND client_session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_checkout_session
    ON orders(stripe_checkout_session_id)
    WHERE stripe_checkout_session_id IS NOT NULL;

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'single_photo', 'full_gallery'
    price REAL NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES assets(id)
);

-- Upload logs table
CREATE TABLE IF NOT EXISTS upload_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    session_id TEXT,
    office_id TEXT,
    desk_id TEXT,
    file_name TEXT,
    file_size INTEGER,
    mode TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL
);

-- Indexes for upload logs
CREATE INDEX IF NOT EXISTS idx_upload_logs_office_id ON upload_logs(office_id);
CREATE INDEX IF NOT EXISTS idx_upload_logs_session_id ON upload_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_upload_logs_created_at ON upload_logs(created_at);

-- Multipart upload parts are tracked in D1 to avoid lost updates when the
-- desktop uploader sends several R2 parts concurrently.
CREATE TABLE IF NOT EXISTS upload_parts (
    session_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    part_number INTEGER NOT NULL,
    etag TEXT NOT NULL,
    size INTEGER NOT NULL,
    office_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (session_id, chunk_index),
    FOREIGN KEY (office_id) REFERENCES offices(id)
);

CREATE INDEX IF NOT EXISTS idx_upload_parts_office_id ON upload_parts(office_id);
CREATE INDEX IF NOT EXISTS idx_upload_parts_created_at ON upload_parts(created_at);

-- Webhook events table
CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    processed INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TEXT NOT NULL,
    processed_at TEXT
);

-- Indexes for webhook events
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);

-- Distributed rate limit counters (shared across Worker instances)
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    window_start TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

-- API keys table (for rotation)
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    office_id TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    name TEXT,
    last_used_at TEXT,
    expires_at TEXT,
    revoked_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
);
