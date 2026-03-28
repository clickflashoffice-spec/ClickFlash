
import { TransferService } from '../../services/TransferService';
import { limitConcurrency } from '../../shared/limitConcurrency';
import fs from 'fs';
// import path from 'path'; // Unused

// Mock dependencies
const mockDbManager = {
    query: jest.fn(),
    get: jest.fn()
};

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};

const mockWss = {
    clients: []
};

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    promises: {
        copyFile: jest.fn(),
        writeFile: jest.fn()
    }
}));

describe('TransferService', () => {
    let service: TransferService;

    beforeEach(() => {
        service = new TransferService({
            dbManager: mockDbManager as any,
            logger: mockLogger as any,
            wss: mockWss
        });
        jest.clearAllMocks();
    });

    it('should send album photos to destinations', async () => {
        // Setup Mocks
        const albumId = 'album-123';
        const destinations = new Set<string>(['/mock/kiosk1', '/mock/kiosk2']);

        // Mock DB responses
        mockDbManager.query
            .mockReturnValueOnce([ // Photos
                { id: 1, url: 'photo1.jpg' },
                { id: 2, url: 'photo2.jpg' }
            ])
            .mockReturnValueOnce([ // Faces
                { photoId: 1, descriptor: '[0.1, 0.2]' }
            ]);

        mockDbManager.get.mockReturnValue({ title: 'Test Album' });

        // Mock FS
        (fs.existsSync as jest.Mock).mockReturnValue(true); // Source files exist

        // Execute
        const result = await service.sendAlbumToKiosks(albumId, destinations);

        // Verify
        expect(result.success).toBe(true);
        expect(result.copiedCount).toBe(4); // 2 photos * 2 destinations
        expect(mockDbManager.query).toHaveBeenCalledTimes(2); // 1 for photos, 1 for faces
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
