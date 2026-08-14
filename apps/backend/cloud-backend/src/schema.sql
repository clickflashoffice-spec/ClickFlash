DROP TABLE IF EXISTS photos;
DROP TABLE IF EXISTS events;

CREATE TABLE events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    access_code TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE photos (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    r2_path TEXT NOT NULL,
    size INTEGER NOT NULL,
    camera_id TEXT,
    ai_tags TEXT,
    raw_r2_path TEXT,
    raw_size INTEGER,
    raw_status TEXT DEFAULT 'pending',
    raw_metadata TEXT,
    quality_score INTEGER,
    curation_status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE INDEX idx_photos_event ON photos(event_id);

CREATE TABLE IF NOT EXISTS raw_export_jobs (
    id TEXT PRIMARY KEY,
    event_id TEXT,
    status TEXT DEFAULT 'pending',
    total_files INTEGER DEFAULT 0,
    processed_files INTEGER DEFAULT 0,
    export_r2_path TEXT,
    filter_tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_raw_export_jobs_event ON raw_export_jobs(event_id);

CREATE TABLE IF NOT EXISTS photographers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    station_id TEXT,
    face_vector TEXT,
    face_enrolled_at INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY,
    photographer_id TEXT NOT NULL,
    type TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    biometric_verified INTEGER DEFAULT 0,
    biometric_method TEXT DEFAULT 'LOCAL_AUTH',
    biometric_confidence REAL,
    face_vector_hash TEXT,
    station_id TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    resort_id TEXT,
    photographer_id TEXT,
    guest_name TEXT,
    status TEXT,
    sync_status TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    notified_at TIMESTAMP,
    abandoned_email_sent INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    stripe_payment_intent_id TEXT,
    amount REAL,
    currency TEXT,
    status TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS global_settings (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT
);

CREATE TABLE IF NOT EXISTS fleet_nodes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    status TEXT DEFAULT 'offline',
    last_seen TIMESTAMP,
    version TEXT,
    metrics_json TEXT,
    sync_status_json TEXT,
    orders_json TEXT,
    photos_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resorts_config (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region_id TEXT NOT NULL,
    country TEXT,
    base_currency TEXT DEFAULT 'EUR',
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS white_label_configs (
    id TEXT PRIMARY KEY,
    resort_id TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#38bdf8',
    domain_cname TEXT,
    receipt_footer TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sla_heartbeat_history (
    id TEXT PRIMARY KEY,
    station_id TEXT NOT NULL,
    resort_id TEXT,
    region_id TEXT,
    timestamp TEXT NOT NULL,
    latency_ms INTEGER DEFAULT 0,
    status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    booking_date TEXT NOT NULL,
    booking_time TEXT,
    session_id TEXT,
    photographer_id TEXT,
    status TEXT DEFAULT 'Pending',
    destination_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS packs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    products_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rosters (
    id TEXT PRIMARY KEY,
    photographer_id TEXT NOT NULL,
    shift_start TIMESTAMP NOT NULL,
    shift_end TIMESTAMP NOT NULL,
    station_id TEXT,
    status TEXT DEFAULT 'SCHEDULED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS photographer_events_v1 (
    id TEXT PRIMARY KEY,
    aggregate_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS order_state (
    id TEXT PRIMARY KEY,
    photographer_id TEXT,
    session_id TEXT,
    status TEXT,
    total_amount REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_state (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    amount REAL,
    status TEXT,
    processed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commission_state (
    id TEXT PRIMARY KEY,
    photographer_id TEXT,
    total_commission REAL DEFAULT 0,
    pending_commission REAL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_cost_ledger (
  id TEXT PRIMARY KEY,
  function_name TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd REAL NOT NULL DEFAULT 0.0,
  resort_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_date ON ai_cost_ledger(created_at);
