/**
 * Mock API Service for Testing
 */
import { Photo, Album } from '../../types';

export const mockPhotos: Photo[] = [
    {
        id: 'photo-1',
        albumId: 'album-1',
        url: 'https://example.com/photo1.jpg',
        title: 'Test Photo 1',
        photographerId: 'user-1',
        manualEdits: null,
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z',
    },
    {
        id: 'photo-2',
        albumId: 'album-1',
        url: 'https://example.com/photo2.jpg',
        title: 'Test Photo 2',
        photographerId: 'user-1',
        manualEdits: null,
        created: '2024-01-02T00:00:00Z',
        updated: '2024-01-02T00:00:00Z',
    },
    {
        id: 'photo-3',
        albumId: 'album-1',
        url: 'https://example.com/photo3.jpg',
        title: 'Test Photo 3',
        photographerId: 'user-2',
        manualEdits: null,
        created: '2024-01-03T00:00:00Z',
        updated: '2024-01-03T00:00:00Z',
    },
];

export const mockAlbum: Album = {
    id: 'album-1',
    title: 'Test Album',
    photographerId: 'user-1',
    status: 'Draft' as const,
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z',
};

export const apiService = {
    getAlbum: jest.fn().mockResolvedValue(mockAlbum),
    getPhotosPaginated: jest.fn().mockResolvedValue({
        items: mockPhotos,
        totalItems: mockPhotos.length,
        page: 1,
        totalPages: 1,
    }),
    getPhotos: jest.fn().mockResolvedValue(mockPhotos),
    createAlbum: jest.fn(),
    updateAlbum: jest.fn(),
    deleteAlbum: jest.fn(),
    updatePhoto: jest.fn(),
};

// Reset mocks between tests
export const resetApiMocks = () => {
    apiService.getAlbum.mockClear();
    apiService.getPhotosPaginated.mockClear();
    apiService.getPhotos.mockClear();
    apiService.createAlbum.mockClear();
    apiService.updateAlbum.mockClear();
    apiService.deleteAlbum.mockClear();
    apiService.updatePhoto.mockClear();
    
    // Reset to default resolved values
    apiService.getAlbum.mockResolvedValue(mockAlbum);
    apiService.getPhotosPaginated.mockResolvedValue({
        items: mockPhotos,
        totalItems: mockPhotos.length,
        page: 1,
        totalPages: 1,
    });
    apiService.getPhotos.mockResolvedValue(mockPhotos);
};
