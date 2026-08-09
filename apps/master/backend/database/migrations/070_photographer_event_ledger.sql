-- Versioned, append-only photographer finance and workforce event foundation.
-- Amounts live inside payload_json as integer minor units and are validated by
-- the shared PhotographerEventV1 contract before insertion.

CREATE TABLE IF NOT EXISTS photographer_events_v1 (
  event_id TEXT PRIMARY KEY,
  schema_version TEXT NOT NULL CHECK (schema_version = '1'),
  producer TEXT NOT NULL CHECK (producer IN (
    'MASTER',
    'GALLERY',
    'MANAGEMENT_HUB',
    'CLOUD_BACKEND',
    'MOBILE_PHOTOGRAPHER',
    'SYSTEM_IMPORT'
  )),
  producer_event_id TEXT NOT NULL,
  photographer_id TEXT NOT NULL,
  desk_id TEXT NOT NULL,
  tenant_id TEXT,
  timezone TEXT NOT NULL,
  event_kind TEXT NOT NULL CHECK (event_kind IN (
    'ORDER_COMPLETED',
    'PAYMENT_CAPTURED',
    'SETTLEMENT_POSTED',
    'REFUND_POSTED',
    'ATTRIBUTION_ASSIGNED',
    'COMMISSION_ACCRUED',
    'ADJUSTMENT_POSTED',
    'PAYOUT_POSTED',
    'SHIFT_STARTED',
    'SHIFT_ENDED',
    'BREAK_STARTED',
    'BREAK_ENDED',
    'REVERSAL_POSTED',
    'RECONCILIATION_APPROVED'
  )),
  occurred_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  correlation_id TEXT,
  causation_event_id TEXT,
  reversal_of_event_id TEXT,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  event_sha256 TEXT NOT NULL CHECK (
    length(event_sha256) = 64 AND event_sha256 NOT GLOB '*[^0-9a-f]*'
  ),
  inserted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (producer, producer_event_id),
  FOREIGN KEY (causation_event_id) REFERENCES photographer_events_v1(event_id),
  FOREIGN KEY (reversal_of_event_id) REFERENCES photographer_events_v1(event_id)
);

CREATE INDEX IF NOT EXISTS idx_photographer_events_v1_scope_time
  ON photographer_events_v1(photographer_id, desk_id, tenant_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_photographer_events_v1_kind_time
  ON photographer_events_v1(event_kind, occurred_at);

CREATE INDEX IF NOT EXISTS idx_photographer_events_v1_source
  ON photographer_events_v1(source_record_id, event_kind);

CREATE UNIQUE INDEX IF NOT EXISTS idx_photographer_events_v1_single_reversal
  ON photographer_events_v1(reversal_of_event_id)
  WHERE reversal_of_event_id IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS photographer_events_v1_no_update
BEFORE UPDATE ON photographer_events_v1
BEGIN
  SELECT RAISE(ABORT, 'photographer_events_v1 is append-only');
END;

CREATE TRIGGER IF NOT EXISTS photographer_events_v1_no_delete
BEFORE DELETE ON photographer_events_v1
BEGIN
  SELECT RAISE(ABORT, 'photographer_events_v1 is append-only');
END;
