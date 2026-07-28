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
    media_type TEXT NOT NULL,
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
