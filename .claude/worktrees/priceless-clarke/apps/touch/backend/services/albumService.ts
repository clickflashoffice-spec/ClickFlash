// backend/services/albumService.ts
// Album Service
// Standardized album creation logic ported from Master

import { DatabaseManager } from '../shared/db';
// import Logger from '../shared/logger'; 
import { RealtimeService } from './realtimeService';

interface ServiceContext {
    dbManager: DatabaseManager;
    logger: any;
    realtimeService?: RealtimeService;
}

interface CreateAlbumData {
    id: string;
    title?: string;
    date?: string;
    status?: string;
    kiosk_ready?: boolean;
    roomNumber?: string;
    photographerId?: number | string;
    source?: string;
    categories?: string[];
}

export class AlbumService {
    private dbManager: DatabaseManager;
    private logger: any;
    private realtimeService?: RealtimeService;

    constructor(context: ServiceContext) {
        this.dbManager = context.dbManager;
        this.logger = context.logger;
        this.realtimeService = context.realtimeService;
    }

    /**
     * Create a new album if it doesn't exist
     */
    public createAlbum(data: CreateAlbumData): any {
        if (!data.id) throw new Error('Album ID is required');

        const existing = this.dbManager.get('SELECT * FROM albums WHERE id = ?', [data.id]);
        if (existing) {
            return existing;
        }

        const now = new Date().toISOString();
        const dateStr = now.split('T')[0];

        const album = {
            id: data.id,
            title: data.title || `Album ${data.id}`,
            date: data.date || dateStr,
            status: data.status || 'active',
            kiosk_ready: data.kiosk_ready !== undefined ? (data.kiosk_ready ? 1 : 0) : 1, // Default to 1 (visible) for Touch
            roomNumber: data.roomNumber || '',
            photographerId: data.photographerId || null,
            created_at: now,
            updated_at: now,
            categories: data.categories || [],
            source: data.source || 'local'
        };

        try {
            this.dbManager.run(
                `INSERT INTO albums (id, title, date, status, kiosk_ready, roomNumber, photographerId, created_at, updated_at, categories, source) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    album.id,
                    album.title,
                    album.date,
                    album.status,
                    album.kiosk_ready,
                    album.roomNumber,
                    album.photographerId,
                    album.created_at,
                    album.updated_at,
                    JSON.stringify(album.categories),
                    album.source
                ]
            );

            if (this.logger && this.logger.info) {
                this.logger.info(`[AlbumService] Created new album: ${album.id}`);
            }

            // Realtime Update is not critical for Touch backend yet, but good to have prepared
            /*
            if (this.realtimeService) {
                this.realtimeService.broadcast({
                    collection: 'albums',
                    action: 'create',
                    record: album
                });
            }
            */

            return album;
        } catch (err: any) {
            if (this.logger && this.logger.error) {
                this.logger.error(`[AlbumService] Failed to create album ${data.id}`, { error: err.message });
            }
            throw err;
        }
    }
}

export default AlbumService;
