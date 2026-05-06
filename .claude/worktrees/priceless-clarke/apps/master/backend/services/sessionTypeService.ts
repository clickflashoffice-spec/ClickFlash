import { DatabaseManager } from '../shared/db';
import { Logger } from '../shared/logger';
import { v4 as uuidv4 } from 'uuid';

interface SessionType {
    id: string;
    name: string;
    numberOfPhotos?: number;
    price?: number;
    created_at: string;
    updated_at: string;
}

interface CreateSessionTypeDTO {
    name: string;
    numberOfPhotos?: number;
    price?: number;
}

interface UpdateSessionTypeDTO {
    name?: string;
    numberOfPhotos?: number;
    price?: number;
}

export class SessionTypeService {
    private dbManager: DatabaseManager;
    private logger: Logger;

    constructor(dbManager: DatabaseManager, logger: Logger) {
        this.dbManager = dbManager;
        this.logger = logger;
    }

    public getAll(): SessionType[] {
        return this.dbManager.query<SessionType>('SELECT * FROM session_types ORDER BY name ASC');
    }

    public getById(id: string): SessionType | undefined {
        return this.dbManager.get<SessionType>('SELECT * FROM session_types WHERE id = ?', [id]);
    }

    public create(data: CreateSessionTypeDTO): SessionType {
        const id = uuidv4();
        const now = new Date().toISOString();

        const sessionType: SessionType = {
            id,
            name: data.name,
            numberOfPhotos: data.numberOfPhotos || 0,
            price: data.price || 0,
            created_at: now,
            updated_at: now
        };

        this.dbManager.run(
            `INSERT INTO session_types (id, name, numberOfPhotos, price, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [sessionType.id, sessionType.name, sessionType.numberOfPhotos, sessionType.price, sessionType.created_at, sessionType.updated_at]
        );

        if (this.logger.info) this.logger.info(`[SessionTypeService] Created session type: ${sessionType.name} (${id})`);

        return sessionType;
    }

    public update(id: string, data: UpdateSessionTypeDTO): SessionType {
        const existing = this.getById(id);
        if (!existing) throw new Error('Session Type not found');

        const now = new Date().toISOString();
        const updated: SessionType = {
            ...existing,
            ...data,
            updated_at: now
        };

        const fields: string[] = [];
        const values: any[] = [];

        if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
        if (data.numberOfPhotos !== undefined) { fields.push('numberOfPhotos = ?'); values.push(data.numberOfPhotos); }
        if (data.price !== undefined) { fields.push('price = ?'); values.push(data.price); }

        fields.push('updated_at = ?');
        values.push(now);
        values.push(id); // Where ID

        if (fields.length > 1) { // More than just updated_at
            this.dbManager.run(
                `UPDATE session_types SET ${fields.join(', ')} WHERE id = ?`,
                values
            );
        }

        if (this.logger.info) this.logger.info(`[SessionTypeService] Updated session type: ${id}`);
        return updated;
    }

    public delete(id: string): void {
        this.dbManager.run('DELETE FROM session_types WHERE id = ?', [id]);
        if (this.logger.info) this.logger.info(`[SessionTypeService] Deleted session type: ${id}`);
    }
}

export default SessionTypeService;
