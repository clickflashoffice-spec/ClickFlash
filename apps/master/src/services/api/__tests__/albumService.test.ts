import { albumService } from '../albumService';
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

describe('albumService', () => {
    const baseUrl = 'http://localhost:8090';

    beforeEach(() => {
        resetPbMocks();
    });

    describe('Photo URL Construction', () => {
        const mockPhoto = {
            id: 'photo1',
            albumId: 'album1',
            url: 'image.jpg'
        };

        it('should construct original photo URL', async () => {
            mockCollection.getFullList.mockResolvedValue([mockPhoto]);
            const photos = await albumService.getAlbumPhotos('album1');

            expect(photos[0].url).toBe(`${baseUrl}/api/files/photos/photo1/album1/highres/image.jpg`);
        });

        it('should construct tiny/thumb/preview URLs', async () => {
            mockCollection.getFullList.mockResolvedValue([mockPhoto]);
            const photos = await albumService.getAlbumPhotos('album1');

            expect(photos[0].thumbnailUrl).toBe(`${baseUrl}/api/files/photos/photo1/album1/thumbs/photo1_thumb.jpg`);
            expect(photos[0].previewUrl).toBe(`${baseUrl}/api/files/photos/photo1/album1/thumbs/photo1_preview.jpg`);
        });

        it('should handle already absolute URLs in photo record', async () => {
            const absolutePhoto = {
                id: 'p2',
                url: 'https://other.com/img.png'
            };
            mockCollection.getFullList.mockResolvedValue([absolutePhoto]);
            const photos = await albumService.getAlbumPhotos('a1');
            expect(photos[0].url).toBe('https://other.com/img.png');
        });
    });

    describe('Manual Edits Parsing', () => {
        it('should parse stringified manualEdits', async () => {
            const mockPhoto = {
                id: 'p1',
                manualEdits: '{"exposure": 20, "contrast": 10}'
            };
            mockCollection.getFullList.mockResolvedValue([mockPhoto]);
            const photos = await albumService.getAlbumPhotos('a1');
            expect(photos[0].manualEdits).toEqual({ exposure: 20, contrast: 10 });
        });

        it('should handle already parsed object manualEdits', async () => {
            const mockPhoto = {
                id: 'p1',
                manualEdits: { exposure: 15 }
            };
            mockCollection.getFullList.mockResolvedValue([mockPhoto]);
            const photos = await albumService.getAlbumPhotos('a1');
            expect(photos[0].manualEdits).toEqual({ exposure: 15 });
        });

        it('should handle null or invalid manualEdits', async () => {
            const mockPhoto = { id: 'p1', manualEdits: 'invalid-json' };
            mockCollection.getFullList.mockResolvedValue([mockPhoto]);
            const photos = await albumService.getAlbumPhotos('a1');
            expect(photos[0].manualEdits).toBeUndefined();
        });
    });

    describe('Pagination', () => {
        it('should respect perPage safety limits', async () => {
            mockCollection.getList.mockResolvedValue({
                items: [],
                totalItems: 0,
                page: 1,
                perPage: 50,
                totalPages: 0
            });

            await albumService.getAlbumsPaginated(1, 500); // Requested 500

            // Should be clamped to 100 in the implementation
            expect(mockCollection.getList).toHaveBeenCalledWith(1, 100, expect.anything());
        });
    });

    describe('getAlbum', () => {
        it('should fetch album data and its photos', async () => {
            const mockAlbum = { id: 'a1', title: 'Test Album' };
            const mockPhotos = [{ id: 'p1', albumId: 'a1' }, { id: 'p2', albumId: 'a1' }];

            mockCollection.getOne = jest.fn().mockResolvedValue(mockAlbum);
            mockCollection.getFullList.mockResolvedValue(mockPhotos);

            const result = await albumService.getAlbum('a1');

            expect(result?.id).toBe('a1');
            expect(result?.photos).toHaveLength(2);
            expect(result?.photos?.[0].id).toBe('p1');
        });

        it('should return null if album not found', async () => {
            mockCollection.getOne = jest.fn().mockRejectedValue(new Error('404'));
            const result = await albumService.getAlbum('non-existent');
            expect(result).toBeNull();
        });
    });

    describe('patchPhotos', () => {
        it('should stringify manualEdits during update', async () => {
            const updates = [
                { id: 'p1', data: { manualEdits: { exposure: 10 } as any } }
            ];
            mockCollection.update.mockResolvedValue({});

            const success = await albumService.patchPhotos(updates);

            expect(success).toBe(true);
            expect(mockCollection.update).toHaveBeenCalledWith('p1', expect.objectContaining({
                manualEdits: '{"exposure":10}'
            }));
        });

        it('should remove readonly fields before update', async () => {
            const updates = [
                { id: 'p1', data: { id: 'p1', created: 'date', updated: 'date', title: 'New' } }
            ];
            mockCollection.update.mockResolvedValue({});

            await albumService.patchPhotos(updates);

            const callData = mockCollection.update.mock.calls[0][1];
            expect(callData.id).toBeUndefined();
            expect(callData.created).toBeUndefined();
            expect(callData.title).toBe('New');
        });
    });
});
