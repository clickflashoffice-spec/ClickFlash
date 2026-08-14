import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { albumService } from '../services/api/albumService';
import { Album } from '../types';

/**
 * Query key factory for albums
 */
export const albumKeys = {
    all: ['albums'] as const,
    lists: () => [...albumKeys.all, 'list'] as const,
    list: (filters?: { status?: string; photographerId?: number }) =>
        [...albumKeys.lists(), filters] as const,
    infinite: (sort: string = '-created', filter: string = '') =>
        [...albumKeys.all, 'infinite', { sort, filter }] as const,
    details: () => [...albumKeys.all, 'detail'] as const,
    detail: (id: string) => [...albumKeys.details(), id] as const,
};

/**
 * Hook to fetch all albums (Legacy - "Fetch All")
 */
export function useAlbums() {
    return useQuery({
        queryKey: albumKeys.lists(),
        queryFn: () => apiService.getAlbums(),
    });
}

/**
 * Hook to fetch albums with infinite scrolling
 */
export function useInfiniteAlbums(sort: string = '-created', filter: string = '') {
    return useInfiniteQuery({
        queryKey: albumKeys.infinite(sort, filter),
        queryFn: async ({ pageParam = 1 }) => {
            // Use albumService directly
            return albumService.getAlbumsPaginated(pageParam, 50, sort, filter);
        },
        getNextPageParam: (lastPage) => {
            if (lastPage.page && lastPage.totalPages && lastPage.page < lastPage.totalPages) {
                return lastPage.page + 1;
            }
            return undefined;
        },
        initialPageParam: 1,
    });
}

/**
 * Hook to fetch a single album by ID
 */
export function useAlbum(id: string | null) {
    return useQuery({
        queryKey: albumKeys.detail(id || ''),
        queryFn: () => apiService.getAlbum(id!),
        enabled: !!id,
    });
}

/**
 * Hook to create a new album
 */
export function useCreateAlbum() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (albumData: Partial<Album>) => apiService.createAlbum(albumData),
        onSuccess: () => {
            // Invalidate and refetch albums list
            queryClient.invalidateQueries({ queryKey: albumKeys.all });
        },
    });
}

/**
 * Hook to update an album
 */
export function useUpdateAlbum() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Album> }) =>
            apiService.updateAlbum(id, data),
        onSuccess: (_, variables) => {
            // Invalidate both the list and the specific album
            queryClient.invalidateQueries({ queryKey: albumKeys.all });
            queryClient.invalidateQueries({ queryKey: albumKeys.detail(variables.id) });
        },
    });
}

/**
 * Hook to delete an album
 */
export function useDeleteAlbum() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => apiService.deleteAlbum(id),
        onSuccess: () => {
            // Invalidate and refetch albums list
            queryClient.invalidateQueries({ queryKey: albumKeys.all });
        },
    });
}
