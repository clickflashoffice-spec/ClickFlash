// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAlbums, useAlbum, useCreateAlbum, useUpdateAlbum, useDeleteAlbum, albumKeys } from '../useAlbums';
import { useQuery, useMutation } from '@tanstack/react-query';

// Mock dependencies
vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useQueryClient: vi.fn(() => ({
        invalidateQueries: vi.fn(),
    })),
    useInfiniteQuery: vi.fn(),
}));

vi.mock('../../services/apiService', () => ({
    apiService: {
        getAlbums: vi.fn(),
        getAlbum: vi.fn(),
        createAlbum: vi.fn(),
        updateAlbum: vi.fn(),
        deleteAlbum: vi.fn(),
    }
}));

vi.mock('../../services/api/albumService', () => ({
    albumService: {
        getAlbumsPaginated: vi.fn(),
    }
}));

describe('useAlbums hooks structure', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
