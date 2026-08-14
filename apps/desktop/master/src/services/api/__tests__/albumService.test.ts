import { albumService } from '../albumService';
import { mockCollection, resetPbMocks } from '../../__mocks__/pb';

Object.defineProperty(global, 'crypto', {
    value: {
        randomUUID: () => '12345678-1234-1234-1234-123456789012'
    }
});


jest.mock('../../pb', () => ({
    pb: require('../../__mocks__/pb').pb,
}));

describe('albumService', () => {

    beforeEach(() => {
        resetPbMocks();
    });

    describe('getAlbums', () => {
        it('should fetch albums', async () => {
            const mockAlbums = [
                { id: 'a1', title: 'Album 1', coverPhotoUrl: 'cover.jpg' },
            ];
            mockCollection.getFullList.mockResolvedValue(mockAlbums);

            const albums = await albumService.getAlbums();

            expect(albums).toHaveLength(1);
            expect((albums[0] as any).title).toBe('Album 1');
        });

        it('should return empty array on error', async () => {
            mockCollection.getFullList.mockRejectedValue(new Error('DB error'));

            const albums = await albumService.getAlbums();

            expect(albums).toEqual([]);
        });
    });

    describe('getPhotosForAlbum', () => {
        it('should fetch photos for album', async () => {
            const mockPhotos = [
                { id: 'p1', albumId: 'a1', url: 'photo.jpg' },
            ];
            mockCollection.getFullList.mockResolvedValue(mockPhotos);

            const photos = await albumService.getPhotosForAlbum('a1');

            expect(photos).toHaveLength(1);
            expect(photos[0].id).toBe('p1');
        });
    });

    describe('getAlbum', () => {
        it('should fetch single album', async () => {
            const mockAlbum = { id: 'a1', title: 'Album 1' };
            mockCollection.getOne.mockResolvedValue(mockAlbum);

            const album = await albumService.getAlbum('a1');

            expect(album).toBeDefined();
            expect((album as any)?.title).toBe('Album 1');
        });
    });

    describe('createAlbum', () => {
        it('should create new album', async () => {
            const newAlbum = { title: 'New Album' };
            mockCollection.create.mockResolvedValue({ id: '12345678-1234-1234-1234-123456789012', ...newAlbum });

            const created = await albumService.createAlbum(newAlbum as any);

            expect((created as any).title).toBe('New Album');
        });
    });

    describe('updateAlbum', () => {
        it('should update album', async () => {
            const updates = { title: 'Updated Album' };
            mockCollection.update.mockResolvedValue({ id: 'a1', ...updates });

            const result = await albumService.updateAlbum('a1', updates as any);

            expect(result.success).toBe(true);
            expect((result.album as any)?.title).toBe('Updated Album');
        });
    });

    describe('deleteAlbum', () => {
        it('should delete album', async () => {
            mockCollection.delete.mockResolvedValue(true);

            const result = await albumService.deleteAlbum('a1');

            expect(result).toBeDefined();
        });
    });
});
