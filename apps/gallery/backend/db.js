const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = null;
    }

    connect() {
        try {
            const dir = path.dirname(this.dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            this.db = new Database(this.dbPath);
            this.db.pragma('journal_mode = WAL');
            console.log(`[Database] Connected to ${this.dbPath}`);

            this.runMigrations();
        } catch (err) {
            console.error('[Database] Connection failed:', err);
            throw err;
        }
    }

    runMigrations() {
        const migrationTable = `
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        this.db.exec(migrationTable);

        const migrationsDir = path.join(__dirname, 'migrations');
        if (!fs.existsSync(migrationsDir)) {
            console.log('[Database] No migrations directory found.');
            return;
        }

        const files = fs.readdirSync(migrationsDir).sort();

        const getApplied = this.db.prepare('SELECT name FROM migrations');
        const applied = new Set(getApplied.all().map(m => m.name));

        const insertMigration = this.db.prepare('INSERT INTO migrations (name) VALUES (?)');

        for (const file of files) {
            if (!file.endsWith('.sql')) continue;
            if (applied.has(file)) continue;

            console.log(`[Database] Applying migration: ${file}`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

            try {
                this.db.transaction(() => {
                    this.db.exec(sql);
                    insertMigration.run(file);
                })();
            } catch (err) {
                // Handle duplicate column errors (SQLite doesn't support IF NOT EXISTS for ALTER TABLE)
                if (err.message && err.message.includes('duplicate column')) {
                    console.log(`[Database] Migration ${file} skipped: columns already exist`);
                    // Still mark as applied to avoid retrying
                    insertMigration.run(file);
                } else {
                    throw err;
                }
            }
        }
    }

    // Generic Helpers
    query(sql, params = []) {
        return this.db.prepare(sql).all(params);
    }

    get(sql, params = []) {
        return this.db.prepare(sql).get(params);
    }

    run(sql, params = []) {
        return this.db.prepare(sql).run(params);
    }

    // Transaction helper
    transaction(fn) {
        return this.db.transaction(fn)();
    }
}

module.exports = DatabaseManager;
