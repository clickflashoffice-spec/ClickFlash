import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import { logger } from '../utils/logger';

addRxPlugin(RxDBLeaderElectionPlugin);

export const KioskSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        type: { type: 'string', enum: ['ORDER', 'BIOMETRIC_MATCH', 'SYNC_EVENT'] },
        payload: { type: 'object' },
        timestamp: { type: 'number' },
        synced: { type: 'boolean', default: false },
        retryCount: { type: 'number', default: 0 }
    },
    required: ['id', 'type', 'payload', 'timestamp']
};

export async function initRxDB() {
    try {
        const db = await createRxDatabase({
            name: 'kiosk_crdt_db',
            storage: getRxStorageDexie(),
            multiInstance: true,
            eventReduce: true
        });

        await db.addCollections({
            crdt_events: {
                schema: KioskSchema
            }
        });

        logger.info('[RxDB] Local CRDT database initialized for Offline Kiosk.');
        return db;
    } catch (err: any) {
        logger.error('[RxDB] Initialization failed:', err);
        throw err;
    }
}
