import { renderHook } from '@testing-library/react';
import { useAlbums, useAlbum, useCreateAlbum, useUpdateAlbum, useDeleteAlbum, albumKeys } from '../useAlbums';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Mock dependencies
jest.mock('@tanstack/react-query', () => ({
    useQuery: jest.fn(),
    useMutation: jest.fn(),
    useQueryClient: jest.fn(() => ({
        invalidateQueries: jest.fn(),
    })),
    useInfiniteQuery: jest.fn(),
}));

jest.mock('../../services/apiService', () => ({
    apiService: {
        getAlbums: jest.fn(),
        getAlbum: jest.fn(),
        createAlbum: jest.fn(),
        updateAlbum: jest.fn(),
        deleteAlbum: jest.fn(),
    }
}));

jest.mock('../../services/api/albumService', () => ({
    albumService: {
        getAlbumsPaginated: jest.fn(),
    }
}));

describe('useAlbums hooks structure', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('albumKeys', () => {
        it('generates correct query keys', () => {
            expect(albumKeys.all).toEqual(['albums']);
            expect(albumKeys.lists()).toEqual(['albums', 'list']);
            expect(albumKeys.detail('123')).toEqual(['albums', 'detail', '123']);
        });
    });

    describe('useAlbums', () => {
        it('calls useQuery with correct parameters', () => {
            renderHook(() => useAlbums());
            expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({
                queryKey: albumKeys.lists(),
            }));
        });
    });

    describe('useAlbum', () => {
        it('calls useQuery with correct parameters and is enabled when id exists', () => {
            renderHook(() => useAlbum('123'));
            expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({
                queryKey: albumKeys.detail('123'),
                enabled: true,
            }));
        });

        it('disables query when id is null', () => {
            renderHook(() => useAlbum(null));
            expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({
                queryKey: albumKeys.detail(''),
                enabled: false,
            }));
        });
    });

    describe('Mutations', () => {
        it('useCreateAlbum calls useMutation', () => {
            renderHook(() => useCreateAlbum());
            expect(useMutation).toHaveBeenCalled();
        });

        it('useUpdateAlbum calls useMutation', () => {
            renderHook(() => useUpdateAlbum());
            expect(useMutation).toHaveBeenCalled();
        });

        it('useDeleteAlbum calls useMutation', () => {
            renderHook(() => useDeleteAlbum());
            expect(useMutation).toHaveBeenCalled();
        });
    });
});
