-- Add CRM Leads Table
CREATE TABLE IF NOT EXISTS crm_leads (
    id TEXT PRIMARY KEY,
    desk_id TEXT,
    resort TEXT,
    contact TEXT,
    role TEXT,
    status TEXT DEFAULT 'New',
    last_action TEXT,
    priority TEXT DEFAULT 'Medium',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add HR Staff Actions Table
CREATE TABLE IF NOT EXISTS hr_staff_actions (
    id TEXT PRIMARY KEY,
    desk_id TEXT,
    name TEXT,
    type TEXT, -- 'Recruitment' | 'Exit'
    status TEXT DEFAULT 'Pending',
    date TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add Yield Stats Table
CREATE TABLE IF NOT EXISTS system_yield_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    desk_id TEXT,
    date TEXT,
    total_orders INTEGER,
    paid_orders INTEGER,
    avg_order_value REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
