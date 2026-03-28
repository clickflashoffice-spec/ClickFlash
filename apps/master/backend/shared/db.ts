// backend/shared/db.ts - triggered restart
import Database, { Database as DatabaseType } from "better-sqlite3-multiple-ciphers";
import path from "path";
import fs from "fs";

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

      this.db = new Database(this.dbPath);
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("synchronous = NORMAL");
      this.db.pragma("busy_timeout = 5000");
      this.db.pragma("temp_store = MEMORY");
      this.db.pragma("cache_size = -20000");
      console.info(`[Database] Connected to ${this.dbPath} (WAL Mode Active)`);

      // P2-B: Startup assertion for processing_queue schema
      try {
        this.db.prepare("SELECT priority FROM processing_queue LIMIT 1").get();
      } catch (err: any) {
        if (err.message?.includes("no such column: priority")) {
          console.warn("[Database] WARNING: 'priority' column missing in processing_queue. Awaiting migration 052/053...");
        } else if (!err.message?.includes("no such table: processing_queue")) {
          console.error("[Database] Schema assertion failed:", err.message);
        }
      }

      if (migrationsDir) {
        this.runMigrations(migrationsDir);
      }
    } catch (err) {
      console.error("[Database] Connection failed:", err);
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
      console.log(
        "[Database] No migrations directory found at:",
        migrationsDir,
      );
      return;
    }

    const files = fs.readdirSync(migrationsDir).sort();
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
      console.log(`[Database] 🚀 Applying migration: ${file}`);
      
      const sqlFileContent = fs.readFileSync(fullPath, "utf8");

      try {
        this.transaction(() => {
          try {
            // Execute entire file
            this.db!.exec(sqlFileContent);
          } catch (err: any) {
            const msg = err.message || "";
            // P3-C: Handle idempotent migration attempts gracefully
            if (
              msg.includes("duplicate column name") || 
              msg.includes("already exists") ||
              msg.includes("duplicate column")
            ) {
              console.warn(`[Database] Migration ${file} partially applied previously: ${msg}`);
            } else {
              throw err;
            }
          }
          insertMigration.run(file);
        });
        console.log(`[Database] ✅ Migration successful: ${file}`);
      } catch (err) {
        console.error(`[Database] ❌ CRITICAL: Migration failed in ${file}. Manual intervention may be required.`);
        console.error(`[Database] Error details:`, err);
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
      console.log("[Database] Connection closed");
    }
  }

  public maintenance(): void {
    if (!this.db) return;
    try {
      console.log(
        "[Database] Starting maintenance (VACUUM + Checkpoint + Analyze)...",
      );
      this.db.pragma("wal_checkpoint(RESTART)");
      this.db.exec("VACUUM");
      this.db.exec("ANALYZE"); // Crucial for high-volume query planning
      console.log("[Database] Maintenance complete.");
    } catch (err) {
      console.error("[Database] Maintenance failed:", err);
    }
  }

  public reindex(): void {
    if (!this.db) return;
    try {
      console.log("[Database] Starting REINDEX operation...");
      this.db.exec("REINDEX");
      console.log("[Database] REINDEX complete.");
    } catch (err) {
      console.error("[Database] REINDEX failed:", err);
      throw err;
    }
  }
}

export default DatabaseManager;
