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
    workingHours JSON,
    status TEXT DEFAULT 'Active',
    desk_id TEXT,
    machine_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    pricePerPhoto REAL DEFAULT 0,
    fullGalleryPrice REAL DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    eventType TEXT,
    desk_id TEXT,
    original_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(photographerId) REFERENCES users(id)
);
-- Photos
CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    albumId TEXT NOT NULL,
    title TEXT,
    url TEXT NOT NULL,
    photographerId INTEGER,
    category TEXT,
    manualEdits JSON,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    totalAmount REAL DEFAULT 0,
    -- Some code uses totalAmount
    photographerId INTEGER,
    destinationId TEXT,
    paymentMethod TEXT,
    appliedDiscount REAL DEFAULT 0,
    items JSON,
    albumId TEXT,
    desk_id TEXT,
    original_id TEXT,
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
    isFeatured BOOLEAN DEFAULT 0,
    status TEXT DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Kiosks
CREATE TABLE IF NOT EXISTS kiosks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'Disconnected',
    settings JSON,
    lastHeartbeat DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Sites (needed before desks)
CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    country TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Desks
CREATE TABLE IF NOT EXISTS desks (
    id TEXT PRIMARY KEY,
    name TEXT,
    location TEXT,
    site_id TEXT REFERENCES sites(id),
    status TEXT DEFAULT 'offline',
    pending_commands TEXT DEFAULT '[]', -- JSON array of commands
    last_seen DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Settings
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Studios (Tenants)
CREATE TABLE IF NOT EXISTS studios (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT,
    subscription_status TEXT DEFAULT 'incomplete',
    billing_tier TEXT DEFAULT 'Free',
    photos_this_month INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_studios_stripe_customer ON studios(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_studios_email ON studios(email);

-- Destinations
CREATE TABLE IF NOT EXISTS destinations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    site_code TEXT UNIQUE,
    type TEXT NOT NULL,
    licenseKey TEXT,
    featuresJSON JSON,
    last_seen DATETIME,
    status TEXT DEFAULT 'Offline',
    health_metrics JSON,
    ip_address TEXT,
    version TEXT,
    studio_id TEXT REFERENCES studios(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_destinations_studio ON destinations(studio_id);
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
    productsJSON JSON,
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
    detailsJSON JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(photographerId) REFERENCES users(id)
);
-- Portfolio Items
CREATE TABLE IF NOT EXISTS portfolio_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    title TEXT,
    category TEXT DEFAULT 'General',
    display_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    current_count INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    desk_id TEXT,
    original_id TEXT,
    created TEXT DEFAULT (datetime('now')),
    updated TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_inventory_desk_original ON inventory(desk_id, original_id);
-- Equipment Categories
CREATE TABLE IF NOT EXISTS equipment_categories (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    created TEXT DEFAULT (datetime('now')),
    updated TEXT DEFAULT (datetime('now'))
);
-- Equipment
CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    assignedToPhotographerId TEXT,
    destinationId TEXT,
    purchaseDate TEXT,
    warrantyExpiry TEXT,
    serialNumber TEXT,
    notes TEXT,
    desk_id TEXT,
    original_id TEXT,
    created TEXT DEFAULT (datetime('now')),
    updated TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(assignedToPhotographerId) REFERENCES users(id) ON DELETE
    SET NULL,
        FOREIGN KEY(destinationId) REFERENCES destinations(id) ON DELETE
    SET NULL
);
CREATE INDEX IF NOT EXISTS idx_equipment_desk_original ON equipment(desk_id, original_id);
-- Sync Conflicts
CREATE TABLE IF NOT EXISTS sync_conflicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    existing_desk_id TEXT NOT NULL,
    incoming_desk_id TEXT NOT NULL,
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved INTEGER DEFAULT 0
);
-- Photographer Ledger
CREATE TABLE IF NOT EXISTS photographer_ledger (
    id TEXT PRIMARY KEY,
    photographer_id INTEGER,
    order_id TEXT,
    amount REAL,
    currency TEXT,
    type TEXT,
    rate_snapshot REAL,
    description TEXT,
    desk_id TEXT,
    original_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Daily Objectives
CREATE TABLE IF NOT EXISTS daily_objectives (
    id TEXT PRIMARY KEY,
    photographer_id INTEGER,
    date TEXT NOT NULL,
    target INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    desk_id TEXT,
    original_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- Daily Objectives (End of line 250)
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Sequence Tracking (Phase 30)
CREATE TABLE IF NOT EXISTS sync_sequences (
    id TEXT PRIMARY KEY,
    site_id TEXT UNIQUE NOT NULL,
    counter INTEGER DEFAULT 0,
    last_processed_id TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Vector Clocks (Phase 30)
CREATE TABLE IF NOT EXISTS vector_clocks (
    id TEXT PRIMARY KEY,
    site_id TEXT UNIQUE NOT NULL,
    counter INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Operation Logs (Phase 30 refinement)
CREATE TABLE IF NOT EXISTS operation_logs (
    hub_index INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    table_name TEXT,
    record_id TEXT,
    payload TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    sequence_number INTEGER,
    desk_id TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_op_logs_desk_seq ON operation_logs(desk_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_op_logs_timestamp ON operation_logs(timestamp);

-- Expenses (Multi-desk sync)
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    photographerIds JSON,
    destinationId TEXT,
    invoiceUrl TEXT,
    desk_id TEXT,
    original_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_expenses_desk_original ON expenses(desk_id, original_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- Loans & Advances
CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    photographerId INTEGER NOT NULL,
    amount REAL NOT NULL,
    term_months INTEGER DEFAULT 1,
    interest_rate REAL DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    purpose TEXT,
    desk_id TEXT,
    original_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(photographerId) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_loans_desk_original ON loans(desk_id, original_id);
CREATE INDEX IF NOT EXISTS idx_loans_photographer ON loans(photographerId);

-- Financial Adjustments (Bonuses/Deductions)
CREATE TABLE IF NOT EXISTS adjustments (
    id TEXT PRIMARY KEY,
    photographerId INTEGER NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL, -- Bonus, Deduction, Adjustment
    reason TEXT,
    date TEXT NOT NULL,
    desk_id TEXT,
    original_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(photographerId) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_adjustments_desk_original ON adjustments(desk_id, original_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_photographer ON adjustments(photographerId);

-- B2B Prospecting CRM
CREATE TABLE IF NOT EXISTS prospects (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'New', -- New, Contacted, Qualified, Proposal, Won, Lost
    lead_source TEXT,
    notes TEXT,
    next_follow_up DATETIME,
    linkedin_url TEXT,
    desk_id TEXT,
    original_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_prospects_desk_original ON prospects(desk_id, original_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);

-- AI Duty Dispatcher Tasks
CREATE TABLE IF NOT EXISTS ai_tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    priority TEXT DEFAULT 'Medium', -- Low, Medium, High, Critical
    assigned_to INTEGER,
    status TEXT DEFAULT 'Pending', -- Pending, In Progress, Completed, Blocked
    payload JSON, -- Context for the AI task
    due_date DATETIME,
    desk_id TEXT,
    original_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(assigned_to) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_desk_original ON ai_tasks(desk_id, original_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON ai_tasks(status);

-- Photographer Performance Audits
CREATE TABLE IF NOT EXISTS daily_photographer_audits (
    id TEXT PRIMARY KEY,
    desk_id TEXT NOT NULL,
    photographer_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    total_customers INTEGER DEFAULT 0,
    imported_photos INTEGER DEFAULT 0,
    sold_photos INTEGER DEFAULT 0,
    bad_quality_photos INTEGER DEFAULT 0,
    sales_revenue REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(desk_id, photographer_id, date),
    FOREIGN KEY(photographer_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_audits_desk_photographer_date ON daily_photographer_audits(desk_id, photographer_id, date);

-- Fleet Heartbeats (latest status per desk)
CREATE TABLE IF NOT EXISTS fleet_heartbeats (
    desk_id TEXT PRIMARY KEY,
    last_seen TEXT NOT NULL,
    metrics TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Fleet Heartbeat History
CREATE TABLE IF NOT EXISTS fleet_heartbeat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    desk_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    orders_today INTEGER DEFAULT 0,
    photos_today INTEGER DEFAULT 0,
    pending_sync INTEGER DEFAULT 0,
    sync_status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_fleet_heartbeat_desk ON fleet_heartbeat_history(desk_id);
CREATE INDEX IF NOT EXISTS idx_fleet_heartbeat_time ON fleet_heartbeat_history(timestamp);

-- Master Command Queue
CREATE TABLE IF NOT EXISTS master_command_queue (
    id TEXT PRIMARY KEY,
    desk_id TEXT NOT NULL,
    command_type TEXT NOT NULL,
    payload TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_master_command_queue_desk ON master_command_queue(desk_id, status);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_photos_fileHash ON photos(fileHash);
CREATE INDEX IF NOT EXISTS idx_photos_albumId ON photos(albumId);
CREATE INDEX IF NOT EXISTS idx_portfolio_category ON portfolio_items(category);
CREATE INDEX IF NOT EXISTS idx_portfolio_active ON portfolio_items(active);
CREATE INDEX IF NOT EXISTS idx_albums_photographerId ON albums(photographerId);
CREATE INDEX IF NOT EXISTS idx_photos_photographerId ON photos(photographerId);
CREATE INDEX IF NOT EXISTS idx_orders_photographerId ON orders(photographerId);
CREATE INDEX IF NOT EXISTS idx_orders_albumId ON orders(albumId);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_albums_date ON albums(date);
CREATE INDEX IF NOT EXISTS idx_albums_created_at ON albums(created_at);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_albums_desk_original ON albums(desk_id, original_id);
CREATE INDEX IF NOT EXISTS idx_photos_desk_original ON photos(desk_id, original_id);
CREATE INDEX IF NOT EXISTS idx_orders_desk_original ON orders(desk_id, original_id);
CREATE INDEX IF NOT EXISTS idx_ledger_desk_original ON photographer_ledger(desk_id, original_id);
CREATE INDEX IF NOT EXISTS idx_objectives_desk_original ON daily_objectives(desk_id, original_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_unresolved ON sync_conflicts(resolved, table_name);