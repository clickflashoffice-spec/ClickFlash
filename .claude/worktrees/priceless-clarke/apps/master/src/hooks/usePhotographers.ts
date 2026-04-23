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
        queryKey: ['photographers'],
        queryFn: () => apiService.getUsers(),
        staleTime: 0, // Force fresh fetch for debugging
    });
}
