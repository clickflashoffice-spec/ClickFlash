import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TransferService } from '../../services/TransferService';
import { limitConcurrency } from '../../middleware/limitConcurrency';
import fs from 'fs';

// Mock dependencies
const mockDbManager = {
    query: vi.fn(),
    get: vi.fn(),
    run: vi.fn()
};

const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
};

const mockClient = {
    readyState: 1,
    send: vi.fn()
};

const mockWss = {
    clients: [mockClient]
};

vi.mock('fs', async () => {
    const original = await vi.importActual('fs') as any;
    const overrides = {
        existsSync: vi.fn(),
        mkdirSync: vi.fn(),
        readdirSync: vi.fn(),
        unlinkSync: vi.fn(),
        promises: {
            ...original.promises,
            copyFile: vi.fn().mockResolvedValue(undefined),
            writeFile: vi.fn().mockResolvedValue(undefined),
            readFile: vi.fn().mockResolvedValue(Buffer.from('fake-image-binary-data')),
            stat: vi.fn().mockResolvedValue({ size: 1048576 }),
            unlink: vi.fn().mockResolvedValue(undefined)
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
        const albumId = 'album-123';
        const destinations = new Set<string>(['/mock/kiosk1', '/mock/kiosk2']);

        mockDbManager.query.mockImplementation((sql: string) => {
            if (sql.includes('SELECT settings, uploadFolderPath FROM kiosks')) {
                return [
                    { uploadFolderPath: '/mock/kiosk1', settings: '' },
                    { uploadFolderPath: '/mock/kiosk2', settings: '' }
                ];
            }
            if (sql.includes('FROM photos')) {
                return [
                    { id: 1, url: 'photo1.jpg' },
                    { id: 2, url: 'photo2.jpg' }
                ];
            }
            return [];
        });

        mockDbManager.get.mockReturnValue({ title: 'Test Album' });
        (fs.existsSync as any).mockReturnValue(true);

        const result = await service.sendAlbumToKiosks(albumId, destinations);

        expect(result.success).toBe(true);
        expect(result.copiedCount).toBe(4);
        expect(mockDbManager.query).toHaveBeenCalledTimes(3);
        expect(fs.promises.copyFile).toHaveBeenCalledTimes(4);

        expect(fs.promises.writeFile).toHaveBeenCalled();
        const writtenPayload = JSON.parse((fs.promises.writeFile as any).mock.calls[0][1]);
        expect(writtenPayload.photos[0].faces).toBeUndefined();
    });

    it('should enforce biometric air-gapping when sending album to touch (ADR-012)', async () => {
        const albumId = 'album-biometric-test';
        const destinations = new Set<string>(['/mock/kiosk1']);

        mockDbManager.query.mockImplementation((sql: string) => {
            if (sql.includes('SELECT settings, uploadFolderPath FROM kiosks')) {
                return [{ uploadFolderPath: '/mock/kiosk1', settings: '' }];
            }
            if (sql.includes('FROM photos')) {
                return [
                    {
                        id: 'photo-1',
                        url: 'face_photo.jpg',
                        faces: [
                            {
                                faceId: 'face-uuid-001',
                                descriptor: [0.123, -0.456, 0.789],
                                box: { x: 10, y: 20, width: 100, height: 100 }
                            }
                        ]
                    }
                ];
            }
            return [];
        });

        mockDbManager.get.mockReturnValue({ title: 'Biometric Test Album' });
        (fs.existsSync as any).mockReturnValue(true);

        const result = await service.sendAlbumToTouch(albumId, destinations, {
            excludeBiometrics: true
        });

        expect(result.success).toBe(true);
        expect(fs.promises.writeFile).toHaveBeenCalled();
        const writtenPayload = JSON.parse((fs.promises.writeFile as any).mock.calls[0][1]);

        const firstPhoto = writtenPayload.photos[0];
        expect(firstPhoto.faces).toBeDefined();
        expect(firstPhoto.faces[0].faceId).toBe('face-uuid-001');
        // Raw ArcFace 512D float embeddings MUST NOT be exported
        expect(firstPhoto.faces[0].descriptor).toBeUndefined();
    });

    it('should import photos from removable drive with zero-deletion guarantee (ADR-012)', async () => {
        const mountPath = 'E:/';

        (fs.existsSync as any).mockImplementation((p: string) => {
            const normalized = String(p).replace(/\\/g, '/');
            if (normalized.includes('E:') || normalized.includes('uploads') || normalized.includes('DCIM')) return true;
            return false;
        });

        (fs.readdirSync as any).mockImplementation((dir: string) => {
            const normalized = String(dir).replace(/\\/g, '/');
            if (normalized.includes('DCIM') && !normalized.includes('100NIKON')) {
                return [
                    { name: '100NIKON', isFile: () => false, isDirectory: () => true }
                ];
            }
            if (normalized.includes('100NIKON')) {
                return [
                    { name: 'DSC_0001.JPG', isFile: () => true, isDirectory: () => false },
                    { name: 'DSC_0002.NEF', isFile: () => true, isDirectory: () => false },
                    { name: 'INDEX.DAT', isFile: () => true, isDirectory: () => false } // Ignored non-image
                ];
            }
            return [];
        });

        mockDbManager.get.mockReturnValue(undefined); // No duplicate hashes
        mockDbManager.run.mockReturnValue({ changes: 1 });

        const result = await service.importFromRemovableDrive(mountPath, {
            photographerId: 'photographer-42'
        });

        expect(result.success).toBe(true);
        expect(result.totalFound).toBe(2);
        expect(result.importedCount).toBe(2);
        expect(result.skippedCount).toBe(0);

        // Verify photos table insertion
        expect(mockDbManager.run).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO photos'),
            expect.any(Array)
        );

        // CRITICAL INVARIANT: Zero card deletion. Original files must NEVER be removed.
        expect(fs.unlinkSync).not.toHaveBeenCalled();
        expect(fs.promises.unlink).not.toHaveBeenCalled();

        // Verify WebSocket events emitted
        expect(mockClient.send).toHaveBeenCalledWith(
            expect.stringContaining('SD_CARD_IMPORT_PROGRESS')
        );
        expect(mockClient.send).toHaveBeenCalledWith(
            expect.stringContaining('SD_CARD_IMPORT_COMPLETE')
        );
    });

    it('should skip duplicate photos during removable drive import', async () => {
        const mountPath = 'D:/';

        (fs.existsSync as any).mockReturnValue(true);
        (fs.readdirSync as any).mockReturnValue([
            { name: 'IMG_0001.JPG', isFile: () => true, isDirectory: () => false }
        ]);

        // Mock that the hash already exists in DB
        mockDbManager.get.mockReturnValue({ id: 'existing-photo-id' });

        const result = await service.importFromRemovableDrive(mountPath);

        expect(result.success).toBe(true);
        expect(result.totalFound).toBe(1);
        expect(result.importedCount).toBe(0);
        expect(result.skippedCount).toBe(1);

        // copyFile should not have been called for duplicate
        expect(fs.promises.copyFile).not.toHaveBeenCalled();
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
