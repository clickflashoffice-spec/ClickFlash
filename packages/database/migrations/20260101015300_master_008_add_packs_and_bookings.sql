-- Add Packs table
CREATE TABLE IF NOT EXISTS IF NOT EXISTS packs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    productsJSON JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add Bookings table
CREATE TABLE IF NOT EXISTS IF NOT EXISTS bookings (
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(photographerId) REFERENCES users(id)
);

