-- Users (Photographers & Admins)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT, -- Hashed
    role TEXT NOT NULL DEFAULT 'Photographer',
    specialty TEXT,
    avatarUrl TEXT,
    monthlyTarget INTEGER DEFAULT 0,
    dailyPhotoTarget INTEGER DEFAULT 0,
    payrollType TEXT DEFAULT 'Salary',
    monthlySalary REAL,
    commissionRate REAL,
    destinationId TEXT,
    workingHours JSON,
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
    categories JSON,
    kiosk_ready INTEGER DEFAULT 0, -- Added for immediate kiosk visibility
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(photographerId) REFERENCES users(id)
);

-- Photos
CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    albumId TEXT NOT NULL,
    title TEXT,
    url TEXT NOT NULL, -- Path or URL
    photographerId INTEGER,
    category TEXT,
    manualEdits JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(albumId) REFERENCES albums(id) ON DELETE CASCADE
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    clientName TEXT,
    email TEXT,
    status TEXT DEFAULT 'Pending',
    total REAL DEFAULT 0,
    photographerId INTEGER,
    destinationId TEXT,
    paymentMethod TEXT,
    appliedDiscount REAL DEFAULT 0,
    items JSON, -- Storing items as JSON for simplicity in Phase 1, can normalize later
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    isFeatured BOOLEAN DEFAULT 0
);

-- Kiosks
CREATE TABLE IF NOT EXISTS kiosks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'Disconnected',
    settings JSON
);

-- Settings / Key-Value Store
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSON
);

-- Destinations
CREATE TABLE IF NOT EXISTS destinations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    type TEXT NOT NULL,
    licenseKey TEXT,
    featuresJSON JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);