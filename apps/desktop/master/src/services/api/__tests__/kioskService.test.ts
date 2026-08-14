import { kioskService } from '../kioskService';
import { mockCollection, resetPbMocks } from '../../__mocks__/pb';

// Mock the logger
jest.mock('../../../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
    },
}));

// Mock the actual pb module
jest.mock('../../pb', () => ({
    pb: require('../../__mocks__/pb').pb,
}));

describe('kioskService', () => {
    beforeEach(() => {
        resetPbMocks();
        global.fetch = jest.fn() as any;
    });

    describe('getKiosks', () => {
        it('should fetch and format kiosks', async () => {
            const mockRecords = [
                { id: '1', name: 'Kiosk 1', status: 'Active', settings: '{"theme":"dark"}', uploadFolderPath: '/path/1', ordersFolderPath: '/orders/1' },
                { id: '2', name: 'Kiosk 2', status: undefined, settings: {}, uploadFolderPath: '/path/2', ordersFolderPath: '/orders/2' }
            ];
            mockCollection.getFullList.mockResolvedValue(mockRecords);

            const results = await kioskService.getKiosks();

            expect(mockCollection.getFullList).toHaveBeenCalled();
            expect(results).toHaveLength(2);
            expect(results[0]).toEqual({
                id: '1',
                name: 'Kiosk 1',
                status: 'Active',
                settings: { theme: 'dark' },
                uploadFolderPath: '/path/1',
                ordersFolderPath: '/orders/1'
            });
            expect(results[1].status).toBe('Disconnected'); // Default status
        });

        it('should handle double-encoded JSON settings', async () => {
            const mockRecords = [
                { id: '1', settings: '"{\\"double\\":true}"' }
            ];
            mockCollection.getFullList.mockResolvedValue(mockRecords);

            const results = await kioskService.getKiosks();
            expect(results[0].settings).toEqual({ double: true });
        });

        it('should handle Windows backslashes in JSON settings strings', async () => {
            const mockRecords = [
                { id: '1', settings: '{"path": "C:\\Photos\\test"}' }
            ];
            mockCollection.getFullList.mockResolvedValue(mockRecords);

            const results = await kioskService.getKiosks();
            // Note: The logic in kioskService for backslashes is complex, 
            // but for a valid JSON string like above, JSON.parse works fine.
            // The service tries to fix it IF JSON.parse fails.
            expect(results[0].settings.path).toBe('C:\\Photos\\test');
        });

        it('should return empty array on failure', async () => {
            mockCollection.getFullList.mockRejectedValue(new Error('DB Error'));
            const results = await kioskService.getKiosks();
            expect(results).toEqual([]);
        });
    });

    describe('getActiveKioskSessions', () => {
        it('should fetch active kiosk IDs', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ activeKioskIds: ['k1', 'k2'] })
            });

            const results = await kioskService.getActiveKioskSessions();

            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/kiosk-sessions'));
            expect(results.has('k1')).toBe(true);
            expect(results.size).toBe(2);
        });

        it('should return empty set on fetch error', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
            const results = await kioskService.getActiveKioskSessions();
            expect(results.size).toBe(0);
        });
    });

    describe('createKiosk', () => {
        it('should create kiosk and clean settings', async () => {
            const inputData = { name: 'New Kiosk', settings: { a: 1, b: undefined } };
            mockCollection.create.mockResolvedValue({ id: 'new-id', name: 'New Kiosk', settings: { a: 1 } });

            const result = await kioskService.createKiosk(inputData);

            expect(mockCollection.create).toHaveBeenCalledWith(expect.objectContaining({
                settings: { a: 1 } // undefined 'b' should be stripped
            }));
            expect(result.id).toBe('new-id');
        });
    });

    describe('deleteKiosk', () => {
        it('should delete kiosk and cleanup sessions', async () => {
            // Setup mock to return sessions
            mockCollection.getFullList.mockResolvedValue([{ id: 's1' }]);

            await kioskService.deleteKiosk('k1');

            // Verify session and kiosk were deleted
            // Note: Pairing requests cleanup may also occur depending on mock behavior
            const deleteCalls = mockCollection.delete.mock.calls.map((c: string[]) => c[0]);
            expect(deleteCalls).toContain('s1');  // Session deleted
            expect(deleteCalls).toContain('k1');  // Kiosk deleted
            expect(mockCollection.delete).toHaveBeenCalledTimes(2);
        });
    });

    describe('sendAlbumToKiosk', () => {
        it('should call send-album API', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, copiedCount: 5 })
            });

            const result = await kioskService.sendAlbumToKiosk('a1', 'k1', ['p1', 'p2']);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/kiosk/send-album'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ albumId: 'a1', kioskId: 'k1', photoIds: ['p1', 'p2'] })
                })
            );
            expect(result.success).toBe(true);
        });

        it('should throw meaningful error on 404', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });

            await expect(kioskService.sendAlbumToKiosk('a1', 'k1'))
                .rejects.toThrow('Backend endpoint not found');
        });
    });
});
