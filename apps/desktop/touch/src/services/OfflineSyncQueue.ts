import { createRxDatabase, RxDatabase, RxCollection } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

export type SyncOperation = {
  id: string;
  type: 'ORDER_CREATE' | 'PRINT_REQUEST' | 'SESSION_START';
  payload: any;
  timestamp: number;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
};

const operationSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    type: { type: 'string' },
    payload: { type: 'object' },
    timestamp: { type: 'number' },
    status: { type: 'string' }
  },
  required: ['id', 'type', 'payload', 'timestamp', 'status']
};

export class OfflineSyncQueue {
  private db: RxDatabase | null = null;
  private isOnline = true;

  constructor() {
    this.initDb();
    this.monitorNetwork();
  }

  private async initDb() {
    this.db = await createRxDatabase({
      name: 'kiosk_offline_db',
      storage: getRxStorageDexie()
    });

    await this.db.addCollections({
      operations: { schema: operationSchema }
    });
    
    // Attempt to sync pending operations on startup
    if (navigator.onLine) {
      this.syncPendingOperations();
    }
  }

  private monitorNetwork() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingOperations();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  public async enqueueOperation(type: SyncOperation['type'], payload: any) {
    if (!this.db) return;

    const op: SyncOperation = {
      id: crypto.randomUUID(),
      type,
      payload,
      timestamp: Date.now(),
      status: 'PENDING'
    };

    const collection = this.db.collections.operations;
    await collection.insert(op);

    if (this.isOnline) {
      this.syncPendingOperations();
    }
  }

  public async syncPendingOperations() {
    if (!this.db || !this.isOnline) return;

    const collection = this.db.collections.operations;
    const pending = await collection.find({ selector: { status: 'PENDING' } }).exec();

    for (const doc of pending) {
      try {
        // Mock cloud sync endpoint
        await fetch('http://localhost:8090/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(doc.toJSON())
        });
        
        await doc.patch({ status: 'SYNCED' });
      } catch (err) {
        console.error('Failed to sync operation', doc.id, err);
      }
    }
  }
}

export const offlineSyncQueue = new OfflineSyncQueue();
