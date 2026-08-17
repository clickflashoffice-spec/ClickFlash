// @vitest-environment jsdom
import { vi, describe, it, test, expect, beforeEach, afterEach } from 'vitest';
import { photoService, validateManualEdits } from '../photoService';
import { mockCollection, resetPbMocks } from '../../__mocks__/pb';
import { INITIAL_EDITS } from '../../../utils/styleUtils';

// Mock the actual pb module
vi.mock('../../pb', () => ({
    pb: require('../../__mocks__/pb').pb,
}));


describe('photoService', () => {
    beforeEach(() => {
        resetPbMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('validateManualEdits', () => {
        it('should sanitize NaN values', () => {
            const dirtyEdits = { exposure: NaN, contrast: 10 };
            const valid = validateManualEdits(dirtyEdits);
            expect(valid.exposure).toBe(INITIAL_EDITS.exposure);
            expect(valid.contrast).toBe(10);
        });

        it('should merge with initial edits', () => {
            const partial = { brightness: 50 };
            const valid = validateManualEdits(partial);
            expect(valid.brightness).toBe(50);
            expect(valid.exposure).toBe(INITIAL_EDITS.exposure);
        });
    });

    describe('updatePhoto', () => {
        it('should retry on network errors', async () => {
            mockCollection.update
                .mockRejectedValueOnce(new Error('Failed to fetch'))
                .mockResolvedValueOnce({ id: 'p1', title: 'Fixed' });

            const promise = photoService.updatePhoto('p1', { title: 'New' });

            // Fast-forward through retries
            await vi.runAllTimersAsync();

            const result = await promise;
            expect(mockCollection.update).toHaveBeenCalledTimes(2);
            expect(result.id).toBe('p1');
        });

        it('should not retry on conflict errors', async () => {
            mockCollection.update.mockRejectedValue(new Error('Update conflict'));

            await expect(photoService.updatePhoto('p1', { title: 'New' }))
                .rejects.toThrow('Update conflict');

            expect(mockCollection.update).toHaveBeenCalledTimes(1);
        });

        it('should validate manualEdits before saving', async () => {
            mockCollection.update.mockResolvedValue({ id: 'p1' });

            await photoService.updatePhoto('p1', { manualEdits: { exposure: NaN } as any });

            expect(mockCollection.update).toHaveBeenCalledWith('p1', expect.objectContaining({
                manualEdits: expect.objectContaining({
                    exposure: INITIAL_EDITS.exposure
                })
            }));
        });
    });

    describe('batchSavePhotos', () => {
        it('should track success and failure counts', async () => {
            mockCollection.update
                .mockResolvedValueOnce({ id: 'p1' })
                .mockRejectedValueOnce(new Error('Fail'))
                .mockResolvedValueOnce({ id: 'p3' });

            const photos = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }];
            const result = await photoService.batchSavePhotos(photos);

            expect(result.successCount).toBe(2);
            expect(result.failureCount).toBe(1);
            expect(result.items).toHaveLength(2);
        });

        it('should skip photos without ID', async () => {
            const photos = [{ title: 'No ID' }];
            const result = await photoService.batchSavePhotos(photos as any);

            expect(result.failureCount).toBe(1);
            expect(mockCollection.update).not.toHaveBeenCalled();
        });
    });

    describe('getPhotoBlobs', () => {
        it('should fetch multiple blobs', async () => {
            const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                blob: async () => mockBlob
            });
            mockCollection.getOne.mockResolvedValue({ id: 'p1', url: 'http://img.jpg' });

            const results = await photoService.getPhotoBlobs(['p1']);

            expect(results.p1).toBe(mockBlob);
            expect(global.fetch).toHaveBeenCalledWith('http://img.jpg');
        });
    });
});
