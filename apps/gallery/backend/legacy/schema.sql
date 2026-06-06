-- Gallery Database Schema for Cloudflare D1

-- Users
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    role TEXT NOT NULL DEFAULT 'Photographer',
    specialty TEXT,
    avatarUrl TEXT,
    monthlyTarget INTEGER DEFAULT 0,
    dailyPhotoTarget INTEGER DEFAULT 0,
    payrollType TEXT DEFAULT 'Salary',
    monthlySalary REAL,
    commissionRate REAL,
    destinationId TEXT,
    workingHours TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Albums
CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    photographerId INTEGER,
    coverPhotoUrl TEXT,
    source TEXT,
    roomNumber TEXT,
    status TEXT DEFAULT 'Draft',
    categories TEXT,
    pricePerPhoto REAL DEFAULT 0,
    fullGalleryPrice REAL DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    eventType TEXT,
    desk_id TEXT,
    original_id TEXT,
    access_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Photos
CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    albumId TEXT NOT NULL,
    title TEXT,
    url TEXT NOT NULL,
    photographerId INTEGER,
    category TEXT,
    manualEdits TEXT,
    fileSize INTEGER,
    width INTEGER,
    height INTEGER,
    fileHash TEXT,
    mimeType TEXT,
    thumbnailUrl TEXT,
    originalFilename TEXT,
    storagePath TEXT,
    desk_id TEXT,
    original_id TEXT,
    access_code TEXT,
    status TEXT DEFAULT 'available',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    clientName TEXT,
    email TEXT,
    status TEXT DEFAULT 'Pending',
    total REAL DEFAULT 0,
    totalAmount REAL DEFAULT 0,
    photographerId INTEGER,
    destinationId TEXT,
    paymentMethod TEXT,
    appliedDiscount REAL DEFAULT 0,
    items TEXT,
    albumId TEXT,
    desk_id TEXT,
    original_id TEXT,
    access_pin TEXT,
    magic_link_token TEXT,
    fulfillment_status TEXT,
    roomNumber TEXT,
    orderNumber TEXT,
    stripe_session_id TEXT,
    stripe_payment_intent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    isFeatured INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Kiosks
CREATE TABLE IF NOT EXISTS kiosks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'Disconnected',
    settings TEXT,
    lastHeartbeat DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Destinations
CREATE TABLE IF NOT EXISTS destinations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    site_code TEXT UNIQUE,
    type TEXT NOT NULL,
    licenseKey TEXT,
    featuresJSON TEXT,
    last_seen DATETIME,
    status TEXT DEFAULT 'Offline',
    health_metrics TEXT,
    ip_address TEXT,
    version TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Session Types
CREATE TABLE IF NOT EXISTS session_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    numberOfPhotos INTEGER,
    price REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Packs
CREATE TABLE IF NOT EXISTS packs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    productsJSON TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    clientName TEXT NOT NULL,
    clientEmail TEXT,
    clientPhone TEXT,
    bookingDate TEXT NOT NULL,
    bookingTime TEXT,
    sessionId TEXT,
    photographerId INTEGER,
    status TEXT DEFAULT 'Pending',
    destinationId TEXT,
    location TEXT,
    message TEXT,
    service_type TEXT,
    detailsJSON TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio Items
CREATE TABLE IF NOT EXISTS portfolio_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    title TEXT,
    category TEXT DEFAULT 'General',
    display_order INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    is_featured INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payment Sessions
CREATE TABLE IF NOT EXISTS payment_sessions (
    id TEXT PRIMARY KEY,
    session_id TEXT UNIQUE,
    customer_email TEXT,
    amount INTEGER,
    currency TEXT DEFAULT 'usd',
    status TEXT DEFAULT 'pending',
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    stripe_customer_id TEXT,
    total_orders INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cart Items
CREATE TABLE IF NOT EXISTS cart_items (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    photo_id TEXT,
    session_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES customers(id),
    FOREIGN KEY(photo_id) REFERENCES photos(id)
);

-- MoneyTrash Purchases (for MoneyTrash integration)
CREATE TABLE IF NOT EXISTS moneytrash_purchases (
    id TEXT PRIMARY KEY,
    photo_id TEXT NOT NULL,
    email TEXT,
    access_code TEXT,
    purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    payment_status TEXT DEFAULT 'completed'
);

-- Access Codes (for gallery access)
CREATE TABLE IF NOT EXISTS access_codes (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    album_id TEXT,
    redirect_url TEXT,
    is_active INTEGER DEFAULT 1,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Webhook Events
CREATE TABLE IF NOT EXISTS webhook_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT,
    processed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Contact Submissions (for website)
CREATE TABLE IF NOT EXISTS contact_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    service TEXT,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_albums_date ON albums(date);
CREATE INDEX IF NOT EXISTS idx_albums_status ON albums(status);
CREATE INDEX IF NOT EXISTS idx_photos_albumId ON photos(albumId);
CREATE INDEX IF NOT EXISTS idx_photos_category ON photos(category);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_portfolio_category ON portfolio_items(category);
CREATE INDEX IF NOT EXISTS idx_portfolio_active ON portfolio_items(active);
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes(code);
CREATE INDEX IF NOT EXISTS idx_moneytrash_access_code ON moneytrash_purchases(access_code);
