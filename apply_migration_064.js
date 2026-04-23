const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'apps', 'master', 'backend', 'database.sqlite');
const migrationPath = path.join(__dirname, 'apps', 'master', 'backend', 'migrations', '064_sync_resilience_standardization.sql');

console.log(`Applying robust migration from: ${migrationPath}`);

if (!fs.existsSync(dbPath)) {
  console.error('Database file not found.');
  process.exit(1);
}

const db = new Database(dbPath);
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

// Smarter splitting: remove comments first
const cleanSql = migrationSql
  .replace(/--.*$/gm, '') // Remove single-line comments
  .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments

const statements = cleanSql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

for (const stmt of statements) {
  try {
    console.log(`Executing: ${stmt.substring(0, 50)}${stmt.length > 50 ? '...' : ''}`);
    db.prepare(stmt).run();
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('  -> Column already exists, skipping.');
    } else if (e.message.includes('already exists')) {
      console.log('  -> Object already exists, skipping.');
    } else {
      console.error(`  -> Failed: ${e.message}`);
    }
  }
}

console.log('Migration process finished.');
db.close();
