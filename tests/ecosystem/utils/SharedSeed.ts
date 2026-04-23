import Database from "better-sqlite3";
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

    const masterDbPath = path.resolve(__dirname, "../../../apps/master/pb_data/master.db");
    const touchDbPath = path.resolve(__dirname, "../../../apps/touch/pb_data/touch.db");

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
      } catch (e: any) {
        if (e.code === 'EBUSY' || e.code === 'EPERM') {
          console.warn(`[Seed] WARNING: Could not delete ${path.basename(dbPath)}. File is locked. Please stop all Master/Touch backend processes and retry.`);
          // We throw because the rest of the seed will fail if we can't reset
          throw e;
        }
        throw e;
      }
    });

    // Seed Master with Admin & Test Site
    const masterDb = new Database(masterDbPath);
    masterDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT,
        name TEXT,
        role TEXT,
        created_at DATETIME,
        updated_at DATETIME
      );
      INSERT INTO users (email, password, name, role, created_at, updated_at) 
      VALUES ('${TEST_EMAIL}', '${TEST_PASS}', 'Admin', 'Admin', datetime('now'), datetime('now'));
      
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE,
        value TEXT
      );
      INSERT INTO settings (key, value) VALUES ('site_id', 'TN-E2E-TEST');
      INSERT INTO settings (key, value) VALUES ('desk_id', 'DESK-001');

      -- Seed Role Permissions (Simplified for E2E)
      CREATE TABLE IF NOT EXISTS role_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT,
        permission TEXT
      );
      INSERT INTO role_permissions (role, permission) VALUES ('Admin', 'manageAllAlbums');
      INSERT INTO role_permissions (role, permission) VALUES ('Admin', 'viewAlbums');
      INSERT INTO role_permissions (role, permission) VALUES ('Admin', 'viewDashboard');

      CREATE TABLE IF NOT EXISTS albums (
        id TEXT PRIMARY KEY,
        name TEXT,
        created_at DATETIME,
        updated_at DATETIME
      );
      INSERT INTO albums (id, name, created_at, updated_at)
      VALUES ('test-album-001', 'Test Album', datetime('now'), datetime('now'));

      CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        album_id TEXT,
        filename TEXT,
        url TEXT,
        thumbnailUrl TEXT,
        created_at DATETIME
      );
      INSERT INTO photos (id, album_id, filename, url, thumbnailUrl, created_at)
      VALUES ('test-photo-001', 'test-album-001', 'photo1.jpg', '/test/photo1.jpg', '/test/thumb1.jpg', datetime('now'));
    `);
    masterDb.close();

    // Seed Touch with config
    const touchDb = new Database(touchDbPath);
    touchDb.exec(`
      CREATE TABLE IF NOT EXISTS config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE,
        value TEXT
      );
      INSERT INTO config (key, value) VALUES ('master_api_url', 'http://localhost:8090');
      INSERT INTO config (key, value) VALUES ('site_id', 'TN-E2E-TEST');
    `);
    touchDb.close();

    console.log("[Seed] Ecosystem Reset Complete.");
  }
}
