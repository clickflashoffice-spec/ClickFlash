const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/**
 * DatabaseManager Class
 * 
 * Manages SQLite database connections and operations for the Master Portal.
 * 
 * Features:
 * - Automatic database initialization
 * - WAL (Write-Ahead Logging) mode for better concurrency
 * - Automatic migration system
 * - Transaction support
 * - Parameterized queries (SQL injection prevention)
 * 
 * @class DatabaseManager
 */
class DatabaseManager {
    /**
     * Create a new DatabaseManager instance
     * 
     * @param {string} dbPath - Path to the SQLite database file
     */
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = null;
    }

    /**
     * Connect to the database and run migrations
     * 
     * Creates the database directory if it doesn't exist,
     * enables WAL mode for better concurrency,
     * and runs any pending migrations.
     * 
     * @throws {Error} If connection fails
     */
    connect() {
        try {
            const dir = path.dirname(this.dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            this.db = new Database(this.dbPath);
            this.db.pragma('journal_mode = WAL'); // Enable WAL for concurrent access
            console.log(`[Database] Connected to ${this.dbPath}`);

            this.runMigrations();
        } catch (err) {
            console.error('[Database] Connection failed:', err);
            throw err;
        }
    }

    /**
     * Run database migrations
     * 
     * Automatically applies SQL migration files from the migrations directory.
     * Tracks applied migrations to avoid re-running them.
     * Handles duplicate column errors gracefully (SQLite limitation).
     */
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

    /**
     * Execute a SELECT query and return all results
     * 
     * @param {string} sql - SQL query with ? placeholders
     * @param {Array} params - Query parameters
     * @returns {Array} Array of result rows
     */
    query(sql, params = []) {
        return this.db.prepare(sql).all(params);
    }

    /**
     * Execute a SELECT query and return a single row
     * 
     * @param {string} sql - SQL query with ? placeholders
     * @param {Array} params - Query parameters
     * @returns {Object|null} Single result row or null
     */
    get(sql, params = []) {
        return this.db.prepare(sql).get(params);
    }

    /**
     * Execute an INSERT, UPDATE, or DELETE query
     * 
     * @param {string} sql - SQL query with ? placeholders
     * @param {Array} params - Query parameters
     * @returns {Object} Result object with changes and lastInsertRowid
     */
    run(sql, params = []) {
        return this.db.prepare(sql).run(params);
    }

    /**
     * Execute a function within a database transaction
     * 
     * All database operations within the function are atomic.
     * If any operation fails, all changes are rolled back.
     * 
     * @param {Function} fn - Function containing database operations
     * @returns {*} Return value of the function
     */
    transaction(fn) {
        return this.db.transaction(fn)();
    }

    /**
     * Close the database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('[Database] Connection closed');
        }
    }
}

module.exports = DatabaseManager;
