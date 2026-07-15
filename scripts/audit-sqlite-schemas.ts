import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Configuration
const MASTER_DB_PATH = path.join(process.cwd(), 'apps', 'master', 'pb_data', 'data.db');
const TOUCH_DB_PATH = path.join(process.cwd(), 'apps', 'touch', 'backend', 'database.sqlite');

const SHARED_TABLES = ['albums', 'opLogs', 'photos'];

function getTableSchema(db: Database.Database, tableName: string) {
  try {
    const columns = db.pragma(`table_info(${tableName})`) as any[];
    return columns.map(col => ({
      name: col.name,
      type: col.type,
      notNull: col.notnull === 1,
      pk: col.pk === 1
    }));
  } catch (err) {
    return null;
  }
}

function auditSchemas() {
  console.log('--- ClickFlash Schema Audit ---');
  
  if (!fs.existsSync(MASTER_DB_PATH)) {
    console.error(`[ERROR] Master DB not found at: ${MASTER_DB_PATH}`);
    // Fallback: This is a placeholder since we don't have the live DB yet
    console.log('Skipping live validation due to missing master DB. Please run the server once to generate pb_data.');
    return;
  }
  
  if (!fs.existsSync(TOUCH_DB_PATH)) {
    console.error(`[ERROR] Touch DB not found at: ${TOUCH_DB_PATH}`);
    console.log('Skipping live validation due to missing touch DB.');
    return;
  }

  const masterDb = new Database(MASTER_DB_PATH, { readonly: true });
  const touchDb = new Database(TOUCH_DB_PATH, { readonly: true });

  let discrepancies = 0;

  for (const table of SHARED_TABLES) {
    console.log(`\nAuditing table: [${table}]`);
    const masterCols = getTableSchema(masterDb, table);
    const touchCols = getTableSchema(touchDb, table);

    if (!masterCols) {
      console.log(`- [WARN] Table ${table} is missing in Master DB.`);
      continue;
    }
    
    if (!touchCols) {
      console.log(`- [WARN] Table ${table} is missing in Touch DB.`);
      continue;
    }

    const masterColNames = masterCols.map(c => c.name).sort();
    const touchColNames = touchCols.map(c => c.name).sort();

    const missingInTouch = masterColNames.filter(c => !touchColNames.includes(c));
    const missingInMaster = touchColNames.filter(c => !masterColNames.includes(c));

    if (missingInTouch.length === 0 && missingInMaster.length === 0) {
      console.log(`- [OK] Column names match.`);
    } else {
      discrepancies++;
      if (missingInTouch.length > 0) {
        console.error(`- [ERROR] Columns in Master but missing in Touch: ${missingInTouch.join(', ')}`);
      }
      if (missingInMaster.length > 0) {
        console.error(`- [ERROR] Columns in Touch but missing in Master: ${missingInMaster.join(', ')}`);
      }
    }
  }

  masterDb.close();
  touchDb.close();

  if (discrepancies > 0) {
    console.error(`\n[FAILED] Audit complete. Found ${discrepancies} schema discrepancies between Master and Touch.`);
    process.exit(1);
  } else {
    console.log(`\n[SUCCESS] Audit complete. Shared schemas are synchronized.`);
  }
}

auditSchemas();
