-- Add missing tenant_id columns to telemetry tables to match schema.ts
ALTER TABLE shifts ADD COLUMN tenant_id TEXT DEFAULT 'default-tenant';
ALTER TABLE transactions ADD COLUMN tenant_id TEXT DEFAULT 'default-tenant';

-- Add composite indexes for telemetry tables to avoid full table scans
CREATE INDEX IF NOT EXISTS idx_shifts_tenant_time ON shifts(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_time ON sessions(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_time ON transactions(tenant_id, created_at DESC);
