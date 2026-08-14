import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { apiService } from "../services/apiService";
import { pb } from "../services/pb";
import { Order } from "../types";

/**
 * Query key factory for orders
 */
export const orderKeys = {
  all: ["orders", "v2"] as const,
  lists: () => [...orderKeys.all, "list"] as const,
  list: (scope: string, filters?: Record<string, any>) =>
    [...orderKeys.lists(), scope, filters] as const,
  details: () => [...orderKeys.all, "detail"] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};

/**
 * Hook to fetch orders (Server-Side Paginated)
 */
export function useOrders(
  page = 1,
  limit = 50,
  filters: {
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {},
) {
  const queryClient = useQueryClient();

  // Subscribe to realtime updates
  useEffect(() => {
    let unsub: (() => void) | undefined;

    const subscribe = async () => {
      unsub = await pb.collection("orders").subscribe("*", () => {
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      });
    };

    subscribe();

    return () => {
      if (unsub) unsub();
    };
  }, [queryClient]);

  return useQuery({
    queryKey: orderKeys.list("dashboard", { page, limit, ...filters }),
    queryFn: () => apiService.getOrders(page, limit, filters),
    // Return only the data array to maintain backward compatibility
    select: (data) => data.data,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch orders with infinite scroll
 */
export function useInfiniteOrders(filter = "", sort = "-created") {
  return useInfiniteQuery({
    queryKey: [...orderKeys.lists(), { filter, sort }] as const,
    queryFn: ({ pageParam = 1 }) =>
      apiService.getOrdersPaginated(pageParam, 50, sort, filter),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.items.length < 50 ? undefined : allPages.length + 1;
    },
    initialPageParam: 1,
  });
}

/**
 * Hook to fetch a single order by ID
 */
export function useOrder(id: string | null) {
  return useQuery({
    queryKey: orderKeys.detail(id || ""),
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
    mutationFn: (orderData: Partial<Order>) =>
      apiService.createOrder(orderData),
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
      queryClient.invalidateQueries({
        queryKey: orderKeys.detail(variables.id),
      });
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
