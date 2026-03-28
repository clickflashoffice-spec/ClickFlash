import Dexie, { Table } from 'dexie';
import { Album, Order } from '../types';
import { QueueItem } from './OfflineQueueV2';
import { AnalyticsEvent, Session } from './offlineAnalytics';

export class StarTouchDB extends Dexie {
    albums!: Table<Album>;
    orders!: Table<Order>;
    offlineQueue!: Table<QueueItem>;
    analyticsEvents!: Table<AnalyticsEvent>;
    analyticsSessions!: Table<Session>;

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
    }
}

export const db = new StarTouchDB();
