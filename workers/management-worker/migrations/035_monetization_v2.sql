-- 035_monetization_v2.sql
-- Schema for Phase 7: Business Logic & Monetization V2 (Licenses, Billing Events, Invoices)

CREATE TABLE IF NOT EXISTS licenses (
    key TEXT PRIMARY KEY,
    desk_id TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    max_masters INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_licenses_desk_id ON licenses(desk_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);

CREATE TABLE IF NOT EXISTS billing_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    desk_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_events_desk_id ON billing_events(desk_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_event_type ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON billing_events(created_at);

CREATE TABLE IF NOT EXISTS billing_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    desk_id TEXT NOT NULL,
    period_start DATETIME NOT NULL,
    period_end DATETIME NOT NULL,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'paid',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_desk_id ON billing_invoices(desk_id);
