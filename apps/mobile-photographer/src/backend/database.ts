import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

const SCHEMA_SQL = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS offline_queue (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    payload TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    retryCount INTEGER NOT NULL DEFAULT 0,
    priority TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS capture_sessions (
    id TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    updated_at INTEGER NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS capture_sessions_one_active
    ON capture_sessions(state)
    WHERE state = 'ACTIVE';

  CREATE TABLE IF NOT EXISTS capture_objects (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    camera_key TEXT NOT NULL,
    camera_device_id INTEGER NOT NULL,
    storage_id INTEGER NOT NULL,
    object_handle INTEGER NOT NULL,
    object_key TEXT NOT NULL,
    filename TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('jpeg', 'raw')),
    expected_byte_size INTEGER NOT NULL,
    actual_byte_size INTEGER,
    sha256 TEXT,
    local_uri TEXT,
    state TEXT NOT NULL,
    camera_created_at INTEGER,
    detected_at INTEGER NOT NULL,
    import_started_at INTEGER,
    imported_at INTEGER,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error_code TEXT,
    last_error_message TEXT,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES capture_sessions(id),
    UNIQUE (session_id, camera_key, object_key)
  );

  CREATE INDEX IF NOT EXISTS capture_objects_session_state
    ON capture_objects(session_id, state, detected_at);

  CREATE INDEX IF NOT EXISTS capture_objects_sha256
    ON capture_objects(sha256)
    WHERE sha256 IS NOT NULL;

  CREATE TABLE IF NOT EXISTS capture_pair_members (
    object_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    camera_key TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('jpeg', 'raw')),
    normalized_stem TEXT NOT NULL,
    sequence_number INTEGER NOT NULL DEFAULT 0 CHECK (sequence_number >= 0),
    camera_created_at INTEGER,
    detected_at INTEGER NOT NULL,
    pair_state TEXT NOT NULL
      CHECK (pair_state IN ('WAITING', 'PAIRED', 'STANDALONE', 'AMBIGUOUS')),
    pair_id TEXT,
    paired_object_id TEXT,
    pair_deadline_at INTEGER NOT NULL,
    paired_at INTEGER,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (object_id) REFERENCES capture_objects(id),
    FOREIGN KEY (paired_object_id) REFERENCES capture_objects(id),
    CHECK (
      (
        pair_state = 'PAIRED'
        AND pair_id IS NOT NULL
        AND paired_object_id IS NOT NULL
        AND paired_at IS NOT NULL
      )
      OR
      (
        pair_state <> 'PAIRED'
        AND pair_id IS NULL
        AND paired_object_id IS NULL
        AND paired_at IS NULL
      )
    )
  );

  CREATE INDEX IF NOT EXISTS capture_pair_members_lookup
    ON capture_pair_members(
      session_id,
      camera_key,
      normalized_stem,
      media_type,
      pair_state
    );

  CREATE INDEX IF NOT EXISTS capture_pair_members_deadline
    ON capture_pair_members(session_id, pair_state, pair_deadline_at);

  CREATE TABLE IF NOT EXISTS capture_assets (
    id TEXT PRIMARY KEY,
    capture_object_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ORIGINAL', 'QUICK_EDIT')),
    media_type TEXT NOT NULL CHECK (media_type IN ('jpeg', 'raw')),
    local_uri TEXT NOT NULL,
    byte_size INTEGER NOT NULL CHECK (byte_size > 0),
    sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (capture_object_id) REFERENCES capture_objects(id),
    UNIQUE (capture_object_id, role)
  );

  CREATE INDEX IF NOT EXISTS capture_assets_session_role
    ON capture_assets(session_id, role, created_at);

  CREATE TABLE IF NOT EXISTS capture_delivery_intents (
    id TEXT PRIMARY KEY,
    capture_object_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    asset_role TEXT NOT NULL CHECK (asset_role IN ('ORIGINAL', 'QUICK_EDIT')),
    destination TEXT NOT NULL CHECK (destination IN ('MASTER', 'KIOSK', 'CLOUD')),
    required INTEGER NOT NULL DEFAULT 0 CHECK (required IN (0, 1)),
    state TEXT NOT NULL CHECK (
      state IN (
        'PENDING',
        'QUEUED',
        'TRANSFERRING',
        'RECEIVED',
        'VERIFIED',
        'READY',
        'PAUSED',
        'RETRYABLE',
        'BLOCKED_POLICY',
        'FAILED_REVIEW'
      )
    ),
    idempotency_key TEXT NOT NULL UNIQUE,
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    next_attempt_at INTEGER,
    last_error_code TEXT,
    last_error_message TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (capture_object_id) REFERENCES capture_objects(id),
    FOREIGN KEY (asset_id) REFERENCES capture_assets(id),
    UNIQUE (capture_object_id, destination, asset_role)
  );

  CREATE INDEX IF NOT EXISTS capture_delivery_intents_outbox
    ON capture_delivery_intents(destination, state, next_attempt_at, created_at);

  CREATE INDEX IF NOT EXISTS capture_delivery_intents_session
    ON capture_delivery_intents(session_id, destination, state);

  CREATE TABLE IF NOT EXISTS capture_delivery_receipts (
    id TEXT PRIMARY KEY,
    intent_id TEXT NOT NULL,
    destination TEXT NOT NULL CHECK (destination IN ('MASTER', 'KIOSK', 'CLOUD')),
    remote_receipt_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    asset_sha256 TEXT NOT NULL CHECK (length(asset_sha256) = 64),
    asset_byte_size INTEGER NOT NULL CHECK (asset_byte_size > 0),
    proof_json TEXT NOT NULL,
    signature TEXT,
    authenticated_at INTEGER NOT NULL,
    received_at INTEGER NOT NULL,
    ready_at INTEGER,
    FOREIGN KEY (intent_id) REFERENCES capture_delivery_intents(id),
    UNIQUE (intent_id, remote_receipt_id)
  );

  CREATE INDEX IF NOT EXISTS capture_delivery_receipts_intent
    ON capture_delivery_receipts(intent_id, received_at);
`;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('clickflash.db');
    await initSchema(db);
  }
  return db;
}

export function getDatabaseSync(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('clickflash.db');
    initSchemaSync(db);
  }
  return db;
}

async function initSchema(database: SQLite.SQLiteDatabase) {
  await database.execAsync(SCHEMA_SQL);
}

function initSchemaSync(database: SQLite.SQLiteDatabase) {
  database.execSync(SCHEMA_SQL);
}
