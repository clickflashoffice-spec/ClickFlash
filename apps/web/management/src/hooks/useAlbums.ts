import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { Album } from '../types';

/**
 * Query key factory for albums
 */
export const albumKeys = {
    all: ['albums'] as const,
    lists: () => [...albumKeys.all, 'list'] as const,
    list: (filters?: { status?: string; photographerId?: number }) => 
        [...albumKeys.lists(), filters] as const,
    details: () => [...albumKeys.all, 'detail'] as const,
    detail: (id: string) => [...albumKeys.details(), id] as const,
};

/**
 * Hook to fetch all albums
 */
export function useAlbums() {
    return useQuery({
        queryKey: albumKeys.lists(),
        queryFn: () => apiService.getAlbums(),
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
            queryClient.invalidateQueries({ queryKey: albumKeys.lists() });
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
            queryClient.invalidateQueries({ queryKey: albumKeys.lists() });
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
            queryClient.invalidateQueries({ queryKey: albumKeys.lists() });
        },
    });
}

