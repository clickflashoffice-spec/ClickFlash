-- Migration 070: Concession Enterprise Schema (Phase 15 Fotiqo Parity & Edge Concession Moat)

CREATE TABLE IF NOT EXISTS gear_assets (
    id TEXT PRIMARY KEY,
    venue_id TEXT NOT NULL,
    asset_tag TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL, -- BODY, LENS, BATTERY, STROBE, SD_CARD, ACCESSORY
    model TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    condition_rating INTEGER NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE, CHECKED_OUT, MAINTENANCE, RETIRED
    assigned_to_user_id TEXT,
    assigned_to_name TEXT,
    battery_health_percent INTEGER DEFAULT 100,
    shutter_count INTEGER DEFAULT 0,
    last_service_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gear_checkouts (
    id TEXT PRIMARY KEY,
    gear_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    checkout_time TEXT NOT NULL,
    return_time TEXT,
    checkout_condition INTEGER NOT NULL,
    return_condition INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gear_id) REFERENCES gear_assets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS print_jobs (
    id TEXT PRIMARY KEY,
    venue_id TEXT NOT NULL,
    printer_name TEXT NOT NULL,
    order_id TEXT NOT NULL,
    photo_url TEXT NOT NULL,
    thumbnail_url TEXT,
    guest_name TEXT,
    paper_size TEXT NOT NULL DEFAULT '6x8', -- 4x6, 6x8, 8x10, A4
    copies INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'QUEUED', -- QUEUED, PRINTING, COMPLETED, FAILED, CANCELLED
    priority INTEGER NOT NULL DEFAULT 5,
    error_message TEXT,
    submitted_at TEXT NOT NULL,
    completed_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shift_schedules (
    id TEXT PRIMARY KEY,
    venue_id TEXT,
    user_id TEXT,
    user_name TEXT,
    user_avatar TEXT,
    employee_id TEXT,
    employee_name TEXT,
    role TEXT,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    assigned_zone TEXT,
    clock_in_time TEXT,
    clock_out_time TEXT,
    status TEXT DEFAULT 'SCHEDULED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_housing_units (
    id TEXT PRIMARY KEY,
    venue_id TEXT NOT NULL,
    building_name TEXT NOT NULL,
    room_number TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 2,
    current_occupancy INTEGER NOT NULL DEFAULT 0,
    monthly_rent_deduction REAL NOT NULL DEFAULT 0.0,
    amenities TEXT, -- JSON array
    status TEXT NOT NULL DEFAULT 'AVAILABLE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sleeping_money_leads (
    id TEXT PRIMARY KEY,
    venue_id TEXT,
    gallery_id TEXT NOT NULL,
    guest_id TEXT,
    guest_phone TEXT,
    guest_email TEXT,
    guest_name TEXT,
    photo_count INTEGER DEFAULT 0,
    abandoned_at TEXT NOT NULL,
    initial_cart_value REAL NOT NULL,
    recovered_value REAL,
    recovery_stage TEXT DEFAULT 'TIER_1_15M',
    channel_used TEXT DEFAULT 'WHATSAPP',
    last_touch_at TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cash_reconciliations (
    id TEXT PRIMARY KEY,
    venue_id TEXT,
    terminal_id TEXT NOT NULL,
    opened_by_user_id TEXT NOT NULL,
    opened_by_user_name TEXT NOT NULL,
    closed_by_user_id TEXT,
    closed_by_user_name TEXT,
    shift_date TEXT NOT NULL,
    float_amount REAL NOT NULL DEFAULT 0.0,
    cash_sales_total REAL NOT NULL DEFAULT 0.0,
    safe_drop_amount REAL NOT NULL DEFAULT 0.0,
    expected_in_drawer REAL NOT NULL DEFAULT 0.0,
    actual_counted REAL NOT NULL DEFAULT 0.0,
    discrepancy_amount REAL NOT NULL DEFAULT 0.0,
    witness_user_id TEXT,
    witness_name TEXT,
    notes TEXT,
    status TEXT DEFAULT 'OPEN',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS keepsake_products (
    id TEXT PRIMARY KEY,
    venue_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- CRYSTAL_3D, FIGURINE_MINI, METAL_PRINT, PHOTO_ALBUM_LUX, CANVAS_WRAP
    description TEXT,
    retail_price REAL NOT NULL,
    lab_cost_price REAL NOT NULL,
    gross_margin_percent REAL NOT NULL,
    preview_image_url TEXT,
    fulfillment_lab TEXT NOT NULL DEFAULT 'WHITEWALL',
    is_available INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS review_interception_logs (
    id TEXT PRIMARY KEY,
    venue_id TEXT NOT NULL,
    guest_name TEXT NOT NULL,
    guest_email TEXT,
    guest_phone TEXT,
    rating_score INTEGER NOT NULL,
    feedback_text TEXT NOT NULL,
    routing_result TEXT NOT NULL,
    compensation_offered TEXT,
    is_resolved_by_manager INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_coaching_logs (
    id TEXT PRIMARY KEY,
    photographer_id TEXT NOT NULL,
    photographer_name TEXT,
    photo_url TEXT,
    photo_id TEXT,
    composition_score INTEGER NOT NULL,
    smile_eye_contact_score INTEGER NOT NULL,
    horizon_tilt_degrees REAL NOT NULL,
    lighting_score INTEGER NOT NULL,
    overall_grade TEXT NOT NULL,
    coaching_tips TEXT, -- JSON array
    evaluated_at TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_gear_assets_venue ON gear_assets(venue_id, status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(venue_id, status);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_date ON shift_schedules(date, venue_id);
CREATE INDEX IF NOT EXISTS idx_sleeping_money_status ON sleeping_money_leads(status, abandoned_at);
CREATE INDEX IF NOT EXISTS idx_cash_reconciliation_date ON cash_reconciliations(shift_date, terminal_id);
