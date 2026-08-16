import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const databaseSource = readFileSync(
  new URL('../src/backend/database.ts', import.meta.url),
  'utf8'
);
const captureLedgerSource = readFileSync(
  new URL('../src/services/CaptureLedgerService.ts', import.meta.url),
  'utf8'
);
const cameraTetherSource = readFileSync(
  new URL('../src/services/CameraTetherService.ts', import.meta.url),
  'utf8'
);
const schemaMatch = databaseSource.match(/const SCHEMA_SQL = `([\s\S]*?)`;/);

test('capture schema creates durable pairing and delivery records', () => {
  expect(schemaMatch, 'SCHEMA_SQL must remain extractable for validation.');
  const androidHome =
    process.env.ANDROID_HOME ??
    path.join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk');
  const sqlite = path.join(androidHome, 'platform-tools', 'sqlite3.exe');
  
  if (!existsSync(sqlite)) {
    console.warn('Skipping test: sqlite3.exe not found at', sqlite);
    return;
  }
  
  const query = `
    ${schemaMatch[1]}
    SELECT 'COLUMN:' || name
      FROM pragma_table_info('capture_pair_members')
      ORDER BY cid;
    SELECT 'INDEX:' || name
      FROM pragma_index_list('capture_pair_members')
      ORDER BY name;
    SELECT 'ASSET_COLUMN:' || name
      FROM pragma_table_info('capture_assets')
      ORDER BY cid;
    SELECT 'INTENT_COLUMN:' || name
      FROM pragma_table_info('capture_delivery_intents')
      ORDER BY cid;
    SELECT 'RECEIPT_COLUMN:' || name
      FROM pragma_table_info('capture_delivery_receipts')
      ORDER BY cid;
    SELECT 'DELIVERY_INDEX:' || name
      FROM sqlite_schema
      WHERE type = 'index'
        AND name LIKE 'capture_delivery_%'
      ORDER BY name;
  `;
  const result = spawnSync(sqlite, [':memory:'], {
    input: query,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const lines = result.stdout.trim().split(/\r?\n/);
  assert.deepEqual(
    lines.filter((line) => line.startsWith('COLUMN:')),
    [
      'COLUMN:object_id',
      'COLUMN:session_id',
      'COLUMN:camera_key',
      'COLUMN:media_type',
      'COLUMN:normalized_stem',
      'COLUMN:sequence_number',
      'COLUMN:camera_created_at',
      'COLUMN:detected_at',
      'COLUMN:pair_state',
      'COLUMN:pair_id',
      'COLUMN:paired_object_id',
      'COLUMN:pair_deadline_at',
      'COLUMN:paired_at',
      'COLUMN:updated_at',
    ]
  );
  expect(lines.includes('INDEX:capture_pair_members_lookup'));
  expect(lines.includes('INDEX:capture_pair_members_deadline'));
  assert.deepEqual(
    lines.filter((line) => line.startsWith('ASSET_COLUMN:')),
    [
      'ASSET_COLUMN:id',
      'ASSET_COLUMN:capture_object_id',
      'ASSET_COLUMN:session_id',
      'ASSET_COLUMN:role',
      'ASSET_COLUMN:media_type',
      'ASSET_COLUMN:local_uri',
      'ASSET_COLUMN:byte_size',
      'ASSET_COLUMN:sha256',
      'ASSET_COLUMN:created_at',
      'ASSET_COLUMN:updated_at',
    ]
  );
  assert.deepEqual(
    lines.filter((line) => line.startsWith('INTENT_COLUMN:')),
    [
      'INTENT_COLUMN:id',
      'INTENT_COLUMN:capture_object_id',
      'INTENT_COLUMN:session_id',
      'INTENT_COLUMN:asset_id',
      'INTENT_COLUMN:asset_role',
      'INTENT_COLUMN:destination',
      'INTENT_COLUMN:required',
      'INTENT_COLUMN:state',
      'INTENT_COLUMN:idempotency_key',
      'INTENT_COLUMN:attempt_count',
      'INTENT_COLUMN:next_attempt_at',
      'INTENT_COLUMN:last_error_code',
      'INTENT_COLUMN:last_error_message',
      'INTENT_COLUMN:created_at',
      'INTENT_COLUMN:updated_at',
    ]
  );
  assert.deepEqual(
    lines.filter((line) => line.startsWith('RECEIPT_COLUMN:')),
    [
      'RECEIPT_COLUMN:id',
      'RECEIPT_COLUMN:intent_id',
      'RECEIPT_COLUMN:destination',
      'RECEIPT_COLUMN:remote_receipt_id',
      'RECEIPT_COLUMN:idempotency_key',
      'RECEIPT_COLUMN:asset_sha256',
      'RECEIPT_COLUMN:asset_byte_size',
      'RECEIPT_COLUMN:proof_json',
      'RECEIPT_COLUMN:signature',
      'RECEIPT_COLUMN:authenticated_at',
      'RECEIPT_COLUMN:received_at',
      'RECEIPT_COLUMN:ready_at',
    ]
  );
  assert.deepEqual(
    lines.filter((line) => line.startsWith('DELIVERY_INDEX:')),
    [
      'DELIVERY_INDEX:capture_delivery_intents_outbox',
      'DELIVERY_INDEX:capture_delivery_intents_session',
      'DELIVERY_INDEX:capture_delivery_receipts_intent',
    ]
  );
});

test('active capture-session startup is coalesced and conflict-safe', () => {
  assert.match(databaseSource, /let dbPromise: Promise<SQLite\.SQLiteDatabase> \| null/);
  assert.match(captureLedgerSource, /activeSessionPromise: Promise<string> \| null/);
  assert.match(cameraTetherSource, /startPromise: Promise<CameraTetherStatus> \| null/);
  assert.match(captureLedgerSource, /INSERT OR IGNORE INTO capture_sessions/);
  assert.match(
    captureLedgerSource,
    /INSERT OR IGNORE INTO capture_sessions[\s\S]*SELECT id FROM capture_sessions/
  );

  expect(schemaMatch, 'SCHEMA_SQL must remain extractable for validation.');
  const androidHome =
    process.env.ANDROID_HOME ??
    path.join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk');
  const sqlite = path.join(androidHome, 'platform-tools', 'sqlite3.exe');
  
  if (!existsSync(sqlite)) {
    console.warn('Skipping test: sqlite3.exe not found at', sqlite);
    return;
  }
  
  const result = spawnSync(sqlite, [':memory:'], {
    input: `
      ${schemaMatch[1]}
      INSERT OR IGNORE INTO capture_sessions (id, state, started_at, updated_at)
        VALUES ('session-a', 'ACTIVE', 1, 1);
      INSERT OR IGNORE INTO capture_sessions (id, state, started_at, updated_at)
        VALUES ('session-b', 'ACTIVE', 2, 2);
      SELECT id || ':' || state FROM capture_sessions ORDER BY id;
    `,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    result.stdout.trim().split(/\r?\n/).filter((line) => line.includes(':ACTIVE')),
    ['session-a:ACTIVE']
  );
});
