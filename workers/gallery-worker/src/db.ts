export interface D1Database {
    prepare(query: string): D1PreparedStatement;
    exec(query: string): Promise<D1Result>;
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

export interface D1PreparedStatement {
    bind(...values: any[]): D1PreparedStatement;
    first<T = unknown>(colName?: string): Promise<T | null>;
    run<T = unknown>(): Promise<D1Result<T>>;
    all<T = unknown>(): Promise<D1Result<T>>;
    raw<T = unknown>(): Promise<T[]>;
}

export interface D1Result<T = unknown> {
    results: T[];
    success: boolean;
    error?: string;
    meta: any;
}

class DatabaseManager {
    private db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    async query<T>(sql: string, params: any[] = []): Promise<T[]> {
        const stmt = this.db.prepare(sql).bind(...params);
        const result = await stmt.all<T>();
        return result.results;
    }

    async get<T>(sql: string, params: any[] = []): Promise<T | null | undefined> {
        const stmt = this.db.prepare(sql).bind(...params);
        return await stmt.first<T>();
    }

    async run(sql: string, params: any[] = []): Promise<D1Result> {
        const stmt = this.db.prepare(sql).bind(...params);
        return await stmt.run();
    }

    async transaction<T>(callback: (db: DatabaseManager) => Promise<T>): Promise<T> {
        // D1 doesn't have a direct transaction() method like better-sqlite3
        // We generally use batch() for atomic operations if needed,
        // but for now we provide the same interface and use the manager.
        return await callback(this);
    }
}

export default DatabaseManager;
