export class DatabaseManager {
    private db: any;
    private static instance: DatabaseManager | null = null;

    constructor(db: any) {
        this.db = db;
    }

    public static setInstance(instance: DatabaseManager): void {
        this.instance = instance;
    }

    public static getInstance(): DatabaseManager {
        if (!this.instance) {
            throw new Error('DatabaseManager instance not set');
        }
        return this.instance;
    }

    async query(sql: string, params: any[] = []): Promise<any[]> {
        if (!this.db) throw new Error('Database not connected');
        const result = await this.db.prepare(sql).bind(...params).all();
        return result.results || [];
    }

    async get(sql: string, params: any[] = []): Promise<any> {
        if (!this.db) throw new Error('Database not connected');
        return await this.db.prepare(sql).bind(...params).first();
    }

    async run(sql: string, params: any[] = []): Promise<any> {
        if (!this.db) throw new Error('Database not connected');
        return await this.db.prepare(sql).bind(...params).run();
    }

    async batch(statements: any[]): Promise<any[]> {
        if (!this.db) throw new Error('Database not connected');
        return await this.db.batch(statements);
    }

    public prepare(sql: string): any {
        if (!this.db) throw new Error('Database not connected');
        return this.db.prepare(sql);
    }
}

export default DatabaseManager;
