import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/apiService';

/**
 * Query key factory for photographers
 */
export const photographerKeys = {
    all: ['photographers'] as const,
    lists: () => [...photographerKeys.all, 'list'] as const,
};

/**
 * Hook to fetch all photographers/users
 */
export function usePhotographers() {
    return useQuery({
        queryKey: photographerKeys.lists(),
        queryFn: () => apiService.getUsers(),
        staleTime: 10 * 60 * 1000, // Photographers change less frequently, cache for 10 minutes
    });
}

