import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { Order } from '../types';

/**
 * Query key factory for orders
 */
export const orderKeys = {
    all: ['orders'] as const,
    lists: () => [...orderKeys.all, 'list'] as const,
    list: (filters?: { status?: string; photographerId?: number }) => 
        [...orderKeys.lists(), filters] as const,
    details: () => [...orderKeys.all, 'detail'] as const,
    detail: (id: string) => [...orderKeys.details(), id] as const,
};

/**
 * Hook to fetch all orders
 */
export function useOrders() {
    return useQuery({
        queryKey: orderKeys.lists(),
        queryFn: () => apiService.getOrders(),
    });
}

/**
 * Hook to fetch a single order by ID
 */
export function useOrder(id: string | null) {
    return useQuery({
        queryKey: orderKeys.detail(id || ''),
        queryFn: () => apiService.getOrder(id!),
        enabled: !!id,
    });
}

/**
 * Hook to create a new order
 */
export function useCreateOrder() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (orderData: Partial<Order>) => apiService.createOrder(orderData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
        },
    });
}

/**
 * Hook to update an order
 */
export function useUpdateOrder() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Order> }) => 
            apiService.updateOrder(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
            queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.id) });
        },
    });
}

/**
 * Hook to delete an order
 */
export function useDeleteOrder() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (id: string) => apiService.deleteOrder(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
        },
    });
}

