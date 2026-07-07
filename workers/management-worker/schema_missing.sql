-- Sites
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
    site_id TEXT,
    status TEXT DEFAULT 'offline',
    pending_commands TEXT DEFAULT '[]',
    last_seen DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sync Sequences
CREATE TABLE IF NOT EXISTS sync_sequences (
    id TEXT PRIMARY KEY,
    site_id TEXT UNIQUE NOT NULL,
    counter INTEGER DEFAULT 0,
    last_processed_id TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Vector Clocks
CREATE TABLE IF NOT EXISTS vector_clocks (
    id TEXT PRIMARY KEY,
    site_id TEXT UNIQUE NOT NULL,
    counter INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Operation Logs
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

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    photographerIds TEXT,
    destinationId TEXT,
    invoiceUrl TEXT,
    desk_id TEXT,
    original_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Loans
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Adjustments
CREATE TABLE IF NOT EXISTS adjustments (
    id TEXT PRIMARY KEY,
    photographerId INTEGER NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    reason TEXT,
    date TEXT NOT NULL,
    desk_id TEXT,
    original_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Prospects
CREATE TABLE IF NOT EXISTS prospects (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'New',
    lead_source TEXT,
    notes TEXT,
    next_follow_up DATETIME,
    linkedin_url TEXT,
    desk_id TEXT,
    original_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI Tasks
CREATE TABLE IF NOT EXISTS ai_tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    priority TEXT DEFAULT 'Medium',
    assigned_to INTEGER,
    status TEXT DEFAULT 'Pending',
    payload TEXT,
    due_date DATETIME,
    desk_id TEXT,
    original_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily Photographer Audits
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
    ai_audit_description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(desk_id, photographer_id, date)
);

-- Fleet Heartbeats
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

-- System Stats
CREATE TABLE IF NOT EXISTS system_stats (
    id TEXT PRIMARY KEY,
    desk_id TEXT NOT NULL,
    date TEXT NOT NULL,
    total_orders INTEGER DEFAULT 0,
    total_revenue REAL DEFAULT 0,
    total_photos INTEGER DEFAULT 0,
    avg_order_value REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Retention Stats
CREATE TABLE IF NOT EXISTS retention_stats (
    id TEXT PRIMARY KEY,
    desk_id TEXT NOT NULL,
    month TEXT NOT NULL,
    returning_customers INTEGER DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    retention_rate REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_ledger_desk_original ON photographer_ledger(desk_id, original_id);
CREATE INDEX IF NOT EXISTS idx_objectives_desk_original ON daily_objectives(desk_id, original_id);
CREATE INDEX IF NOT EXISTS idx_expenses_desk_original ON expenses(desk_id, original_id);
CREATE INDEX IF NOT EXISTS idx_loans_desk_original ON loans(desk_id, original_id);
CREATE INDEX IF NOT EXISTS idx_loans_photographer ON loans(photographerId);
CREATE INDEX IF NOT EXISTS idx_adjustments_desk_original ON adjustments(desk_id, original_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_photographer ON adjustments(photographerId);
CREATE INDEX IF NOT EXISTS idx_prospects_desk_original ON prospects(desk_id, original_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_desk_original ON ai_tasks(desk_id, original_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON ai_tasks(status);
CREATE INDEX IF NOT EXISTS idx_audits_desk_photographer_date ON daily_photographer_audits(desk_id, photographer_id, date);
CREATE INDEX IF NOT EXISTS idx_fleet_heartbeat_desk ON fleet_heartbeat_history(desk_id);
CREATE INDEX IF NOT EXISTS idx_fleet_heartbeat_time ON fleet_heartbeat_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_op_logs_desk_seq ON operation_logs(desk_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_op_logs_timestamp ON operation_logs(timestamp);
