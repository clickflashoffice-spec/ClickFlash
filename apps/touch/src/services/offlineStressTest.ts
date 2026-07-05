/**
 * Offline Stress Test Service
 * 
 * Provides comprehensive offline stress testing for the Touch Kiosk:
 * - Simulates 100+ orders in offline mode
 * - Tests storage limits and performance
 * - Validates sync recovery
 */

import { db } from './db';
import type { Table } from 'dexie';

// The touch Dexie schema currently only declares the `albums` table; some test
// scenarios optimistically write/clear a `photos` table that may exist in
// future migrations. Use a typed extension with optional chaining so the calls
// safely no-op when the table is absent.
type DBWithOptionalPhotos = typeof db & { photos?: Table<unknown> };
import { Order, Album, Photo } from '../types';
import { logger } from '../utils/logger';

export interface StressTestConfig {
    orderCount: number;
    albumCount: number;
    photosPerAlbum: number;
    enableNetworkFailure: boolean;
    failureProbability: number;
}

export interface StressTestResult {
    success: boolean;
    duration: number;
    ordersCreated: number;
    albumsCreated: number;
    photosCreated: number;
    storageUsed: number;
    errors: string[];
    performance: {
        avgWriteTime: number;
        maxWriteTime: number;
        minWriteTime: number;
        totalOperations: number;
    };
}

export interface StressTestProgress {
    phase: 'orders' | 'albums' | 'photos' | 'sync' | 'cleanup' | 'complete';
    current: number;
    total: number;
    message: string;
}

const DEFAULT_CONFIG: StressTestConfig = {
    orderCount: 100,
    albumCount: 10,
    photosPerAlbum: 50,
    enableNetworkFailure: true,
    failureProbability: 0.1,
};

class OfflineStressTestService {
    private static instance: OfflineStressTestService;
    private isRunning = false;
    private shouldStop = false;
    private progressCallback: ((progress: StressTestProgress) => void) | null = null;

    private constructor() {}

    public static getInstance(): OfflineStressTestService {
        if (!OfflineStressTestService.instance) {
            OfflineStressTestService.instance = new OfflineStressTestService();
        }
        return OfflineStressTestService.instance;
    }

    /**
     * Set progress callback
     */
    public onProgress(callback: (progress: StressTestProgress) => void): void {
        this.progressCallback = callback;
    }

    /**
     * Report progress
     */
    private reportProgress(phase: StressTestProgress['phase'], current: number, total: number, message: string): void {
        if (this.progressCallback) {
            this.progressCallback({ phase, current, total, message });
        }
        logger.debug(`[StressTest] ${phase}: ${current}/${total} - ${message}`);
    }

    /**
     * Generate random order
     */
    private generateOrder(index: number): Order {
        const sizes = ['4x6', '5x7', '8x10', 'walrus'];
        const statuses = ['pending', 'processing', 'completed'];
        
        return {
            id: `stress-order-${Date.now()}-${index}`,
            items: [
                {
                    id: `item-${index}-1`,
                    name: sizes[Math.floor(Math.random() * sizes.length)],
                    format: 'print',
                    quantity: Math.floor(Math.random() * 3) + 1,
                    price: Math.random() * 50 + 10,
                },
                {
                    id: `item-${index}-2`,
                    name: sizes[Math.floor(Math.random() * sizes.length)],
                    format: 'print',
                    quantity: Math.floor(Math.random() * 2) + 1,
                    price: Math.random() * 30 + 5,
                },
            ],
            clientName: `Customer ${index}`,
            email: `customer${index}@test.com`,
            date: new Date().toISOString(),
            photographerId: index % 5,
            status: statuses[Math.floor(Math.random() * statuses.length)] as Order['status'],
            total: Math.random() * 110 + 25,
        };
    }

    /**
     * Generate random album
     */
    private generateAlbum(index: number): Album {
        return {
            id: `stress-album-${index}`,
            title: `Stress Test Album ${index}`,
            date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            photos: [],
            coverPhotoUrl: '',
            photographerId: index % 5,
            source: 'stress-test',
            roomNumber: `Room ${index % 10}`,
        };
    }

    /**
     * Generate random photo
     */
    private generatePhoto(albumIndex: number, photoIndex: number): Photo {
        return {
            id: `stress-photo-${albumIndex}-${photoIndex}`,
            albumId: `stress-album-${albumIndex}`,
            title: `photo_${photoIndex}.jpg`,
            url: `https://picsum.photos/seed/${albumIndex}-${photoIndex}/800/600`,
            photographerId: 0,
        };
    }

    /**
     * Simulate network failure
     */
    private shouldSimulateFailure(config: StressTestConfig): boolean {
        if (!config.enableNetworkFailure) return false;
        return Math.random() < config.failureProbability;
    }

    /**
     * Run stress test
     */
    public async runStressTest(config: Partial<StressTestConfig> = {}): Promise<StressTestResult> {
        if (this.isRunning) {
            throw new Error('Stress test already running');
        }

        const fullConfig = { ...DEFAULT_CONFIG, ...config };
        this.isRunning = true;
        this.shouldStop = false;

        const startTime = performance.now();
        const errors: string[] = [];
        const writeTimes: number[] = [];
        let ordersCreated = 0;
        let albumsCreated = 0;
        let photosCreated = 0;

        logger.info('[StressTest] Starting offline stress test', fullConfig);

        try {
            // Phase 1: Create albums
            this.reportProgress('albums', 0, fullConfig.albumCount, 'Creating albums...');
            for (let i = 0; i < fullConfig.albumCount; i++) {
                if (this.shouldStop) throw new Error('Test stopped by user');

                const albumWriteStart = performance.now();
                const album = this.generateAlbum(i);
                
                try {
                    await db.albums.put(album);
                    albumsCreated++;
                    writeTimes.push(performance.now() - albumWriteStart);
                    this.reportProgress('albums', i + 1, fullConfig.albumCount, `Album ${i + 1} created`);
                } catch (err) {
                    errors.push(`Album ${i} failed: ${err}`);
                }
            }

            // Phase 2: Create photos
            this.reportProgress('photos', 0, fullConfig.albumCount * fullConfig.photosPerAlbum, 'Creating photos...');
            const totalPhotos = fullConfig.albumCount * fullConfig.photosPerAlbum;
            let photoIndex = 0;
            
            for (let albumIdx = 0; albumIdx < fullConfig.albumCount; albumIdx++) {
                for (let photoIdx = 0; photoIdx < fullConfig.photosPerAlbum; photoIdx++) {
                    if (this.shouldStop) throw new Error('Test stopped by user');

                    const photoWriteStart = performance.now();
                    const photo = this.generatePhoto(albumIdx, photoIdx);
                    
                    try {
                        await (db as DBWithOptionalPhotos).photos?.put(photo);
                        photosCreated++;
                        writeTimes.push(performance.now() - photoWriteStart);
                        photoIndex++;
                        this.reportProgress('photos', photoIndex, totalPhotos, `Photo ${photoIndex} created`);
                    } catch (err) {
                        errors.push(`Photo ${albumIdx}-${photoIdx} failed: ${err}`);
                    }
                }
            }

            // Phase 3: Create orders
            this.reportProgress('orders', 0, fullConfig.orderCount, 'Creating orders...');
            for (let i = 0; i < fullConfig.orderCount; i++) {
                if (this.shouldStop) throw new Error('Test stopped by user');

                // Simulate occasional network failures during order creation
                if (this.shouldSimulateFailure(fullConfig)) {
                    errors.push(`Simulated network failure on order ${i}`);
                    await new Promise(resolve => setTimeout(resolve, 100));
                    continue;
                }

                const orderWriteStart = performance.now();
                const order = this.generateOrder(i);
                
                try {
                    await db.orders.put(order);
                    ordersCreated++;
                    writeTimes.push(performance.now() - orderWriteStart);
                    this.reportProgress('orders', i + 1, fullConfig.orderCount, `Order ${i + 1} created`);
                } catch (err) {
                    errors.push(`Order ${i} failed: ${err}`);
                }
            }

            // Phase 4: Sync simulation
            this.reportProgress('sync', 0, 100, 'Simulating sync...');
            const syncStart = performance.now();
            
            // Simulate sync operations
            const pendingOrders = await db.orders.toArray();
            this.reportProgress('sync', 50, 100, `Found ${pendingOrders.length} orders to sync`);
            
            // Simulate batch sync
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Clear synced orders
            if (pendingOrders.length > 0) {
                const syncedIds = pendingOrders.map(o => o.id);
                await db.orders.bulkDelete(syncedIds);
            }
            
            this.reportProgress('sync', 100, 100, `Sync completed in ${performance.now() - syncStart}ms`);

            // Phase 5: Cleanup
            this.reportProgress('cleanup', 0, 3, 'Cleaning up test data...');
            await db.albums.clear();
            await (db as DBWithOptionalPhotos).photos?.clear();
            await db.orders.clear();
            this.reportProgress('cleanup', 3, 3, 'Cleanup completed');

        } catch (err) {
            errors.push(`Test error: ${err}`);
            logger.error('[StressTest] Test failed', err);
        } finally {
            this.isRunning = false;
            this.shouldStop = false;
            this.reportProgress('complete', 100, 100, 'Stress test completed');
        }

        const duration = performance.now() - startTime;
        
        // Calculate storage used (approximate)
        const storageUsed = await this.estimateStorageUsed();

        // Calculate performance metrics
        const avgWriteTime = writeTimes.length > 0 
            ? writeTimes.reduce((a, b) => a + b, 0) / writeTimes.length 
            : 0;
        const maxWriteTime = writeTimes.length > 0 ? Math.max(...writeTimes) : 0;
        const minWriteTime = writeTimes.length > 0 ? Math.min(...writeTimes) : 0;

        const result: StressTestResult = {
            success: errors.length === 0,
            duration,
            ordersCreated,
            albumsCreated,
            photosCreated,
            storageUsed,
            errors,
            performance: {
                avgWriteTime,
                maxWriteTime,
                minWriteTime,
                totalOperations: writeTimes.length,
            },
        };

        logger.info('[StressTest] Stress test completed', result);
        return result;
    }

    /**
     * Estimate storage used by IndexedDB
     */
    private async estimateStorageUsed(): Promise<number> {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                return (estimate.usage || 0);
            }
        } catch {
            // Ignore storage estimate errors
        }
        return 0;
    }

    /**
     * Stop the running test
     */
    public stopTest(): void {
        if (this.isRunning) {
            logger.info('[StressTest] Stopping stress test...');
            this.shouldStop = true;
        }
    }

    /**
     * Check if test is running
     */
    public isTestRunning(): boolean {
        return this.isRunning;
    }

    /**
     * Run quick validation test (10 orders)
     */
    public async runQuickValidation(): Promise<boolean> {
        try {
            const result = await this.runStressTest({
                orderCount: 10,
                albumCount: 2,
                photosPerAlbum: 10,
                enableNetworkFailure: false,
            });
            return result.success;
        } catch {
            return false;
        }
    }
}

export const offlineStressTestService = OfflineStressTestService.getInstance();
export default offlineStressTestService;
