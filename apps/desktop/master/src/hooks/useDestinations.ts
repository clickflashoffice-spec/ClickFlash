import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { Destination } from '../types';

/**
 * Query key factory for destinations
 */
export const destinationKeys = {
    all: ['destinations'] as const,
    lists: () => [...destinationKeys.all, 'list'] as const,
};

/**
 * Hook to fetch all destinations
 */
export function useDestinations() {
    return useQuery({
        queryKey: destinationKeys.lists(),
        queryFn: () => apiService.getDestinations(),
    });
}

/**
 * Hook to update a destination
 */
export function useUpdateDestination() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Destination> }) =>
            apiService.updateDestination(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: destinationKeys.lists() });
        },
    });
}

/**
 * Hook to create a new destination
 */
export function useCreateDestination() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Partial<Destination>) => apiService.createDestination(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: destinationKeys.lists() });
        },
    });
}
