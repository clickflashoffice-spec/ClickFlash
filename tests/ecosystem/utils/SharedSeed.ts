import Database from "better-sqlite3-multiple-ciphers";
import path from "path";
import fs from "fs";

/**
 * SharedSeed: Ensures a clean, predictable state across the ecosystem.
 * Used at the start of Ecosystem E2E tests.
 */
export class SharedSeed {
  static async resetEcosystem() {
    console.log("[Seed] Resetting Ecosystem Data...");

    // Consistent credentials with apps/master/tests/e2e/helpers/auth.ts
    const TEST_EMAIL = "admin@clickflash.local";
    const TEST_PASS = "$2b$12$FIj38CWm5vGhjjrH1WdpH.3E0gh56jdrnKuHsvy4v8OLM5ljBMRaq"; // "ClickFlash2025!" (hashed with 12 rounds)

    const masterDbPath = path.resolve(__dirname, "../../../apps/desktop/master/pb_data/master.db");
    const touchDbPath = path.resolve(__dirname, "../../../apps/desktop/touch/pb_data/touch.db");

    // Clear Databases
    [masterDbPath, touchDbPath].forEach(dbPath => {
      try {
        if (fs.existsSync(dbPath)) {
          fs.unlinkSync(dbPath);
          console.log(`[Seed] Deleted ${path.basename(dbPath)}`);
        }
        // Also clear journal files if they exist
        const walPath = `${dbPath}-wal`;
        const shmPath = `${dbPath}-shm`;
        if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      } catch (e: any) {
        if (e.code === 'EBUSY' || e.code === 'EPERM') {
          console.warn(`[Seed] WARNING: Could not delete ${path.basename(dbPath)}. File is locked. Please stop all Master/Touch backend processes and retry.`);
          // We throw because the rest of the seed will fail if we can't reset
          throw e;
        }
        throw e;
      }
    });

    const runMigrationsForDb = (db: any, dirs: string[]) => {
      db.exec('CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP);');
      const getApplied = db.prepare('SELECT name FROM migrations');
      const insertMigration = db.prepare('INSERT INTO migrations (name) VALUES (?)');
      
      for (const dir of dirs) {
        if (!fs.existsSync(dir)) continue;
        const applied = new Set(getApplied.all().map((m: any) => m.name));
        const files = fs.readdirSync(dir).sort();
        
        for (const file of files) {
          if (!file.endsWith(".sql") || applied.has(file)) continue;
          
          const content = fs.readFileSync(path.join(dir, file), "utf8").split(/--\s*Down/i)[0];
          try {
            db.transaction(() => {
              try {
                db.exec(content);
              } catch (err: any) {
                const msg = err.message || '';
                if (msg.includes('duplicate column') || msg.includes('already exists') || msg.includes('duplicate column name')) {
                  // Ignore duplicate column errors like production DB manager
                } else {
                  throw err;
                }
              }
              insertMigration.run(file);
            })();
          } catch (e: any) {
            console.error(`[Seed] Migration Error in ${file}:`, e.message);
          }
        }
      }
    };

    // Initialize Master DB and run migrations
    fs.mkdirSync(path.dirname(masterDbPath), { recursive: true });
    const masterDb = new Database(masterDbPath);
    const masterMigrationsDir1 = path.resolve(__dirname, "../../../apps/desktop/master/backend/database/migrations");
    const masterMigrationsDir2 = path.resolve(__dirname, "../../../apps/desktop/master/backend/migrations");
    runMigrationsForDb(masterDb, [masterMigrationsDir1, masterMigrationsDir2]);

    // Seed Master with Admin & Test Site
    masterDb.exec(`
      INSERT OR IGNORE INTO users (email, password, name, role, created_at, updated_at) 
      VALUES ('${TEST_EMAIL}', '${TEST_PASS}', 'Admin', 'Admin', datetime('now'), datetime('now'));
      
      INSERT OR REPLACE INTO settings (id, key, value) VALUES ('1', 'site_id', 'TN-E2E-TEST');
      INSERT OR REPLACE INTO settings (id, key, value) VALUES ('2', 'desk_id', 'DESK-001');

      INSERT OR IGNORE INTO role_permissions (role, permission) VALUES ('Admin', 'manageAllAlbums');
      INSERT OR IGNORE INTO role_permissions (role, permission) VALUES ('Admin', 'viewAlbums');
      INSERT OR IGNORE INTO role_permissions (role, permission) VALUES ('Admin', 'viewDashboard');

      INSERT OR IGNORE INTO kiosks (id, name, status, signingSecret, created_at, updated_at) 
      VALUES ('test-kiosk-1', 'Test Kiosk 1', 'active', 'test-secret', datetime('now'), datetime('now'));

      INSERT OR IGNORE INTO albums (id, title, date, created_at, updated_at)
      VALUES ('test-album-001', 'Test Album', date('now'), datetime('now'), datetime('now'));

      INSERT OR IGNORE INTO photos (id, albumId, url, thumbnailUrl, created_at)
      VALUES ('test-photo-001', 'test-album-001', '/test/photo1.jpg', '/test/thumb1.jpg', datetime('now'));
    `);
    masterDb.close();

    // Initialize Touch DB and run migrations
    fs.mkdirSync(path.dirname(touchDbPath), { recursive: true });
    const touchDb = new Database(touchDbPath);
    const touchMigrationsDir = path.resolve(__dirname, "../../../apps/desktop/touch/backend/migrations");
    runMigrationsForDb(touchDb, [touchMigrationsDir]);

    // Seed Touch with config
    touchDb.exec(`
      INSERT OR REPLACE INTO settings (id, key, value) VALUES ('s1', 'masterApiUrl', 'http://127.0.0.1:8090');
      INSERT OR REPLACE INTO settings (id, key, value) VALUES ('s2', 'siteId', 'TN-E2E-TEST');
      INSERT OR REPLACE INTO settings (id, key, value) VALUES ('s3', 'kioskId', 'test-kiosk-1');
      INSERT OR REPLACE INTO settings (id, key, value) VALUES ('s4', 'signingSecret', 'test-secret');
    `);
    touchDb.close();

    console.log("[Seed] Ecosystem Reset Complete.");
  }
}
