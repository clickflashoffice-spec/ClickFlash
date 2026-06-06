import Dexie, { Table } from 'dexie';
import { Album, Order } from '../types';
import { QueueItem } from './OfflineQueueV2';
import { AnalyticsEvent, Session } from './offlineAnalytics';

export interface SyncCheckpointRecord {
    id: string; // fixed id: 'default'
    timestamp: number;
    albumsProcessed: string[];
    photosProcessed: string[];
    currentAlbumId?: string;
    currentPhotoIndex?: number;
    totalAlbums: number;
    totalPhotos: number;
    bytesTransferred: number;
    startTime: number;
    syncType: 'full' | 'incremental';
}

export interface SyncConflictRecord {
    id: string;
    orderId: string;
    detectedAt: number;
    resolved: boolean;
    details?: string;
}

export class StarTouchDB extends Dexie {
    albums!: Table<Album>;
    orders!: Table<Order>;
    offlineQueue!: Table<QueueItem>;
    analyticsEvents!: Table<AnalyticsEvent>;
    analyticsSessions!: Table<Session>;
    checkpoints!: Table<SyncCheckpointRecord>;
    conflicts!: Table<SyncConflictRecord>;

    constructor() {
        super('StarTouchDB');
        
        // Version 1: Initial schema
        this.version(1).stores({
            albums: 'id, date, roomNumber',
            orders: 'id, timestamp, status'
        });

        // Version 2: Add offline queue table
        this.version(2).stores({
            albums: 'id, date, roomNumber',
            orders: 'id, timestamp, status',
            offlineQueue: 'id, status, timestamp, priority'
        });

        // Version 3: Add analytics tables
        this.version(3).stores({
            albums: 'id, date, roomNumber',
            orders: 'id, timestamp, status',
            offlineQueue: 'id, status, timestamp, priority',
            analyticsEvents: 'id, type, name, timestamp, sessionId, synced',
            analyticsSessions: 'id, startTime, kioskId'
        });

        // Version 4: Add checkpoints table for sync resume (replaces localStorage)
        this.version(4).stores({
            albums: 'id, date, roomNumber',
            orders: 'id, timestamp, status',
            offlineQueue: 'id, status, timestamp, priority',
            analyticsEvents: 'id, type, name, timestamp, sessionId, synced',
            analyticsSessions: 'id, startTime, kioskId',
            checkpoints: 'id, timestamp'
        });

        // Version 5: Add conflicts table for sync conflict tracking
        this.version(5).stores({
            albums: 'id, date, roomNumber',
            orders: 'id, timestamp, status',
            offlineQueue: 'id, status, timestamp, priority',
            analyticsEvents: 'id, type, name, timestamp, sessionId, synced',
            analyticsSessions: 'id, startTime, kioskId',
            checkpoints: 'id, timestamp',
            conflicts: 'id, orderId, detectedAt, resolved'
        });
    }
}

export const db = new StarTouchDB();
