-- Migration 069: Persistent Write Queue & Mutation Idempotency
-- Phase 2B: Core Reliability Fixes
-- Guarantees zero data loss for in-memory write queue on power cycles.

-- 1. Pending writes table for DbWriteQueue durability
CREATE TABLE IF NOT EXISTS IF NOT EXISTS pending_writes (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    payload_json TEXT NOT NULL,       -- JSON object of column->value
    priority TEXT DEFAULT 'normal',   -- 'normal' | 'high'
    status TEXT DEFAULT 'pending',    -- 'pending' | 'flushing' | 'failed'
    retry_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pending_writes_status ON pending_writes(status);
CREATE INDEX IF NOT EXISTS idx_pending_writes_table_record ON pending_writes(table_name, record_id);

-- 2. Mutation ack log for SyncManager idempotency
-- Prevents duplicate application of the same mutation from a kiosk.
CREATE TABLE IF NOT EXISTS IF NOT EXISTS mutation_ack_log (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    mutation_id TEXT NOT NULL,        -- payload.data.id or explicit idempotency key
    payload_hash TEXT,                -- sha256 of the mutation payload for deep dedup
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, mutation_id)
);

CREATE INDEX IF NOT EXISTS idx_mutation_ack_client ON mutation_ack_log(client_id, mutation_id);

-- 3. Sync pipeline health tracking for CloudSyncService per-pipeline circuit breakers
CREATE TABLE IF NOT EXISTS IF NOT EXISTS sync_pipeline_health (
    pipeline_name TEXT PRIMARY KEY,   -- e.g., 'operation_logs', 'ledger', 'expenses'
    consecutive_failures INTEGER DEFAULT 0,
    last_failure_at DATETIME,
    last_success_at DATETIME,
    circuit_state TEXT DEFAULT 'CLOSED', -- 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    opened_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Idempotency keys for CloudSyncService -> Hub deduplication
CREATE TABLE IF NOT EXISTS IF NOT EXISTS sync_idempotency_keys (
    idempotency_key TEXT PRIMARY KEY,
    desk_id TEXT NOT NULL,
    pipeline_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_idempotency_desk ON sync_idempotency_keys(desk_id, created_at);
