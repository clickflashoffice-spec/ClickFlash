-- Migration: GDPR Compliance Module
-- Date: 2026-06-06

-- General audit log table for GDPR operations
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    actor TEXT,
    target_customer_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_customer ON audit_logs(target_customer_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- Consent records for GDPR consent management
CREATE TABLE IF NOT EXISTS consent_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,
    photo_id TEXT,
    consent_type TEXT NOT NULL,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    withdrawn_at DATETIME,
    ip_address TEXT,
    user_agent TEXT,
    metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_consent_customer ON consent_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_consent_photo ON consent_records(photo_id);
CREATE INDEX IF NOT EXISTS idx_consent_granted ON consent_records(granted_at);
CREATE INDEX IF NOT EXISTS idx_consent_withdrawn ON consent_records(withdrawn_at);

-- Data export requests (GDPR Article 20 portability)
CREATE TABLE IF NOT EXISTS data_export_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    format TEXT DEFAULT 'json',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    download_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_export_customer ON data_export_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_export_status ON data_export_requests(status);
CREATE INDEX IF NOT EXISTS idx_export_created ON data_export_requests(created_at);

-- Data deletion logs (GDPR Article 17 right to erasure)
CREATE TABLE IF NOT EXISTS data_deletion_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,
    deleted_by TEXT,
    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    tables_affected TEXT,
    reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_deletion_customer ON data_deletion_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_deletion_at ON data_deletion_logs(deleted_at);

-- Data Processing Agreement signatures
CREATE TABLE IF NOT EXISTS dpa_signatures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studio_name TEXT NOT NULL,
    signed_by TEXT,
    signed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version TEXT DEFAULT '1.0',
    hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_dpa_studio ON dpa_signatures(studio_name);
CREATE INDEX IF NOT EXISTS idx_dpa_signed_at ON dpa_signatures(signed_at);

-- Breach incident records (GDPR Article 33/34)
CREATE TABLE IF NOT EXISTS breach_incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    severity TEXT NOT NULL,
    discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notified_at DATETIME,
    affected_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open'
);

CREATE INDEX IF NOT EXISTS idx_breach_severity ON breach_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_breach_status ON breach_incidents(status);
CREATE INDEX IF NOT EXISTS idx_breach_discovered ON breach_incidents(discovered_at);

-- Add consent tracking to existing tables
ALTER TABLE photos ADD COLUMN consent_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN gdpr_consent TEXT DEFAULT 'pending';

-- Retention policy settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('gdpr_retention_years', '2');
INSERT OR IGNORE INTO settings (key, value) VALUES ('gdpr_unsold_photo_days', '30');
INSERT OR IGNORE INTO settings (key, value) VALUES ('gdpr_auto_purge_enabled', 'false');
