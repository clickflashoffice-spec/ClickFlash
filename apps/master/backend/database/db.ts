// backend/shared/db.ts - triggered restart
import Database, { Database as DatabaseType } from "better-sqlite3-multiple-ciphers";
import path from "path";
import fs from "fs";
import { logger } from '../utils/logger';

interface Migration {
  id: number;
  name: string;
  applied_at: string;
}

export class DatabaseManager {
  private dbPath: string;
  private db: DatabaseType | null;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.db = null;
  }

  public connect(migrationsDir?: string): void {
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Track whether the DB file pre-existed so we know if encryption is safe to apply.
      const dbAlreadyExists = fs.existsSync(this.dbPath);

      this.db = new Database(this.dbPath);

      // Encryption — enabled when DB_ENCRYPTION_KEY env var is present AND the
      // database is newly created.  Applying a key to an existing plaintext
      // SQLite file causes SQLCipher to mis-interpret the data on every read,
      // which crashes the backend.  Existing databases must be migrated manually
      // (export → delete → reimport with encryption) to gain at-rest encryption.
      const encKey = process.env.DB_ENCRYPTION_KEY;
      if (encKey) {
        if (!/^[0-9a-fA-F]{64}$/.test(encKey)) {
          throw new Error('[Database] FATAL: DB_ENCRYPTION_KEY must be 64 hex characters (256-bit).');
        }
        if (!dbAlreadyExists) {
          this.db.pragma(`key = "x'${encKey}'"`);
          logger.info('[Database] Encryption enabled (SQLCipher) — new database.');
        } else {
          logger.warn('[Database] DB_ENCRYPTION_KEY set but existing database detected — skipping encryption pragma to preserve compatibility. Delete the database file and restart to enable at-rest encryption.');
        }
      } else {
        logger.warn('[Database] DB_ENCRYPTION_KEY not set — database is stored unencrypted at rest. Set this in .env for production.');
      }

      this.db.pragma("journal_mode = WAL");
      this.db.pragma("synchronous = NORMAL");
      this.db.pragma("busy_timeout = 5000");
      this.db.pragma("temp_store = MEMORY");
      this.db.pragma("cache_size = -20000");
      logger.info(`[Database] Connected to ${this.dbPath} (WAL Mode Active)`);

      // P2-B: Startup assertion for processing_queue schema
      try {
        this.db.prepare("SELECT priority FROM processing_queue LIMIT 1").get();
      } catch (err: any) {
        if (err.message?.includes("no such column: priority")) {
          logger.warn("[Database] WARNING: 'priority' column missing in processing_queue. Awaiting migration 052/053...");
        } else if (!err.message?.includes("no such table: processing_queue")) {
          logger.error("[Database] Schema assertion failed:", err.message);
        }
      }

      if (migrationsDir) {
        this.runMigrations(migrationsDir);
      }
    } catch (err) {
      logger.error("[Database] Connection failed:", err);
      throw err;
    }
  }

  public runMigrations(migrationsDir: string): void {
    if (!this.db) throw new Error("Database not connected");

    const migrationTable = `
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
    this.db.exec(migrationTable);

    if (!fs.existsSync(migrationsDir)) {
      logger.info(
        "[Database] No migrations directory found at:",
        migrationsDir,
      );
      return;
    }

    const files = fs.readdirSync(migrationsDir).sort();

    // Warn on duplicate numeric prefixes — these run in alpha order which may
    // not match intended dependency order on fresh installs.
    const prefixMap = new Map<string, string[]>();
    for (const f of files) {
      if (!f.endsWith(".sql")) continue;
      const prefix = f.match(/^(\d+)/)?.[1] ?? f;
      const group  = prefixMap.get(prefix) ?? [];
      group.push(f);
      prefixMap.set(prefix, group);
    }
    for (const [prefix, group] of prefixMap) {
      if (group.length > 1) {
        logger.warn(
          `[Database] WARNING: ${group.length} migrations share prefix "${prefix}" — ` +
          `they run alphabetically (${group.join(", ")}). Verify dependency order on fresh installs.`
        );
      }
    }

    const getApplied = this.db.prepare("SELECT name FROM migrations");
    const applied = new Set(
      (getApplied.all() as Migration[]).map((m) => m.name),
    );
    const insertMigration = this.db.prepare(
      "INSERT INTO migrations (name) VALUES (?)",
    );

    for (const file of files) {
      if (!file.endsWith(".sql")) continue;
      if (applied.has(file)) continue;

      const fullPath = path.join(migrationsDir, file);
      logger.info(`[Database] 🚀 Applying migration: ${file}`);
      
      const sqlFileContent = fs.readFileSync(fullPath, "utf8");
      const upContent = sqlFileContent.split(/--\s*Down/i)[0];

      try {
        this.transaction(() => {
          try {
            // Execute only the Up part
            this.db!.exec(upContent);
          } catch (err: any) {
            const msg = err.message || "";
            // P3-C: Handle idempotent migration attempts gracefully
            if (
              msg.includes("duplicate column name") || 
              msg.includes("already exists") ||
              msg.includes("duplicate column")
            ) {
              logger.warn(`[Database] Migration ${file} partially applied previously: ${msg}`);
            } else {
              throw err;
            }
          }
          insertMigration.run(file);
        });
        logger.info(`[Database] ✅ Migration successful: ${file}`);
      } catch (err) {
        logger.error(`[Database] ❌ CRITICAL: Migration failed in ${file}. Manual intervention may be required.`);
        logger.error(`[Database] Error details:`, err);
        throw err; // Stop the boot sequence on critical failure
      }
    }
  }

  public query<T = any>(sql: string, params: any[] = []): T[] {
    if (!this.db) throw new Error("Database not connected");
    return this.db.prepare(sql).all(params) as T[];
  }

  public get<T = any>(sql: string, params: any[] = []): T | undefined {
    if (!this.db) throw new Error("Database not connected");
    return this.db.prepare(sql).get(params) as T | undefined;
  }

  public run(sql: string, params: any[] = []): Database.RunResult {
    if (!this.db) throw new Error("Database not connected");
    return this.db.prepare(sql).run(params);
  }

  public transaction<T>(fn: () => T): T {
    if (!this.db) throw new Error("Database not connected");
    return this.db.transaction(fn)();
  }

  public exec(sql: string): this {
    if (!this.db) throw new Error("Database not connected");
    this.db.exec(sql);
    return this;
  }

  public prepare(sql: string): Database.Statement {
    if (!this.db) throw new Error("Database not connected");
    return this.db.prepare(sql);
  }

  public getDb(): DatabaseType {
    if (!this.db) throw new Error("Database not connected");
    return this.db;
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      logger.info("[Database] Connection closed");
    }
  }

  public maintenance(): void {
    if (!this.db) return;
    try {
      logger.info(
        "[Database] Starting maintenance (VACUUM + Checkpoint + Analyze)...",
      );
      this.db.pragma("wal_checkpoint(RESTART)");
      this.db.exec("VACUUM");
      this.db.exec("ANALYZE"); // Crucial for high-volume query planning
      logger.info("[Database] Maintenance complete.");
    } catch (err) {
      logger.error("[Database] Maintenance failed:", err);
    }
  }

  public reindex(): void {
    if (!this.db) return;
    try {
      logger.info("[Database] Starting REINDEX operation...");
      this.db.exec("REINDEX");
      logger.info("[Database] REINDEX complete.");
    } catch (err) {
      logger.error("[Database] REINDEX failed:", err);
      throw err;
    }
  }
}

export default DatabaseManager;
