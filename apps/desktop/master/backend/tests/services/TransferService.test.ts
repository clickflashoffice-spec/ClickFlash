import { vi, describe, it, expect, beforeEach } from 'vitest';

import { TransferService } from '../../services/TransferService';
import { limitConcurrency } from '../../middleware/limitConcurrency';
import fs from 'fs';
// import path from 'path'; // Unused

// Mock dependencies
const mockDbManager = {
    query: vi.fn(),
    get: vi.fn()
};

const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
};

const mockWss = {
    clients: []
};

vi.mock('fs', async () => {
    const original = await vi.importActual('fs') as any;
    const overrides = {
        existsSync: vi.fn(),
        mkdirSync: vi.fn(),
        promises: {
            ...original.promises,
            copyFile: vi.fn(),
            writeFile: vi.fn()
        }
    };
    return {
        ...original,
        ...overrides,
        default: {
            ...original,
            ...overrides
        }
    };
});

describe('TransferService', () => {
    let service: TransferService;

    beforeEach(() => {
        service = new TransferService({
            dbManager: mockDbManager as any,
            logger: mockLogger as any,
            wss: mockWss
        });
        vi.clearAllMocks();
    });

    it('should send album photos to destinations', async () => {
        // Setup Mocks
        const albumId = 'album-123';
        const destinations = new Set<string>(['/mock/kiosk1', '/mock/kiosk2']);

        // Mock DB responses
        mockDbManager.query.mockImplementation((sql: string) => {
            if (sql.includes('SELECT settings, uploadFolderPath FROM kiosks')) {
                return [
                    { uploadFolderPath: '/mock/kiosk1', settings: '' },
                    { uploadFolderPath: '/mock/kiosk2', settings: '' }
                ];
            }
            if (sql.includes('FROM photos')) {
                return [ // Photos
                    { id: 1, url: 'photo1.jpg' },
                    { id: 2, url: 'photo2.jpg' }
                ];
            }
            if (sql.includes('FROM faces')) {
                return [ // Faces
                    { photoId: 1, descriptor: '[0.1, 0.2]' }
                ];
            }
            return [];
        });

        mockDbManager.get.mockReturnValue({ title: 'Test Album' });

        // Mock FS
        (fs.existsSync as vi.Mock).mockReturnValue(true); // Source files exist

        // Execute
        const result = await service.sendAlbumToKiosks(albumId, destinations);

        // Verify
        expect(result.success).toBe(true);
        expect(result.copiedCount).toBe(4); // 2 photos * 2 destinations
        expect(mockDbManager.query).toHaveBeenCalledTimes(4); // 2 for kiosks, 1 for photos, 1 for faces
        expect(fs.promises.copyFile).toHaveBeenCalledTimes(4);
    });

    it('should handle concurrency limit', async () => {
        const limit = limitConcurrency(2);
        let active = 0;
        let maxActive = 0;

        const task = async () => {
            active++;
            maxActive = Math.max(maxActive, active);
            await new Promise(resolve => setTimeout(resolve, 10));
            active--;
        };

        await Promise.all([
            limit(task), limit(task), limit(task), limit(task)
        ]);

        expect(maxActive).toBeLessThanOrEqual(2);
    });
});
