// backend/shared/db.ts
import Database, { Database as DatabaseType } from 'better-sqlite3-multiple-ciphers';
import path from 'path';
import fs from 'fs';

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
            // WAL mode is essential for concurrent read/write and visibility on Windows
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('synchronous = NORMAL'); // Recommended for WAL
            this.db.pragma('busy_timeout = 5000'); // Handle transient locks
            this.db.pragma('temp_store = MEMORY');
            this.db.pragma('cache_size = -20000'); // 20MB cache
            this.db.pragma('foreign_keys = ON');
            console.info(`[Database] Connected to ${this.dbPath} (WAL Mode Active)`);

            if (migrationsDir) {
                this.runMigrations(migrationsDir);
            }

            // Periodic WAL checkpoint to prevent unbounded growth
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS _db_metrics (
                    id INTEGER PRIMARY KEY,
                    last_checkpoint DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            const checkpointInfo = this.db.prepare('SELECT last_checkpoint FROM _db_metrics LIMIT 1').get();
            if (!checkpointInfo) {
                this.db.exec('INSERT INTO _db_metrics (id) VALUES (1)');
                this.db.pragma('wal_checkpoint(TRUNCATE)');
                this.db.exec('UPDATE _db_metrics SET last_checkpoint = CURRENT_TIMESTAMP WHERE id = 1');
            }
        } catch (err) {
            console.error('[Database] Connection failed:', err);
            throw err;
        }
    }

    private runMigrations(migrationsDir: string): void {
        if (!this.db) throw new Error('Database not connected');

        const migrationTable = `
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        this.db.exec(migrationTable);

        if (!fs.existsSync(migrationsDir)) {
            console.log('[Database] No migrations directory found at:', migrationsDir);
            return;
        }

        // SECURITY: Validate migration filename format (must be numeric prefix)
        const MIGRATION_PATTERN = /^\d{3}_[a-zA-Z0-9_]+\.sql$/;
        const files = fs.readdirSync(migrationsDir)
            .filter(file => {
                if (!file.endsWith('.sql')) return false;
                if (!MIGRATION_PATTERN.test(file)) {
                    console.warn(`[Database] Skipping invalid migration filename format: ${file}`);
                    return false;
                }
                return true;
            })
            .sort();
        const getApplied = this.db.prepare('SELECT name FROM migrations');
        const applied = new Set((getApplied.all() as Migration[]).map(m => m.name));
        const insertMigration = this.db.prepare('INSERT INTO migrations (name) VALUES (?)');

        for (const file of files) {
            if (!file.endsWith('.sql')) continue;
            if (applied.has(file)) continue;

            console.log(`[Database] Applying migration: ${file}`);
            const sqlFileContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            const statements = sqlFileContent
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0);

            try {
                this.transaction(() => {
                    for (const statement of statements) {
                        try {
                            this.db!.exec(statement);
                        } catch (err: any) {
                            const msg = err.message || '';
                            if (msg.includes('duplicate column name') || msg.includes('already exists')) {
                                console.warn(`[Database] Warning in ${file} (ignored): ${msg}`);
                                continue;
                            }
                            throw err;
                        }
                    }
                    insertMigration.run(file);
                });
            } catch (err) {
                console.error(`[Database] Critical Migration Error in ${file}:`, err);
                throw err;
            }
        }
    }

    public query<T = any>(sql: string, params: any[] = []): T[] {
        if (!this.db) throw new Error('Database not connected');
        return this.db.prepare(sql).all(params) as T[];
    }

    public get<T = any>(sql: string, params: any[] = []): T | undefined {
        if (!this.db) throw new Error('Database not connected');
        return this.db.prepare(sql).get(params) as T | undefined;
    }

    public run(sql: string, params: any[] = []): Database.RunResult {
        if (!this.db) throw new Error('Database not connected');
        return this.db.prepare(sql).run(params);
    }

    public transaction<T>(fn: () => T): T {
        if (!this.db) throw new Error('Database not connected');
        return this.db.transaction(fn)();
    }

    public exec(sql: string): this {
        if (!this.db) throw new Error('Database not connected');
        this.db.exec(sql);
        return this;
    }

    public prepare(sql: string): Database.Statement {
        if (!this.db) throw new Error('Database not connected');
        return this.db.prepare(sql);
    }

    public getDb(): DatabaseType {
        if (!this.db) throw new Error('Database not connected');
        return this.db;
    }

    public close(): void {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('[Database] Connection closed');
        }
    }
}

export default DatabaseManager;
