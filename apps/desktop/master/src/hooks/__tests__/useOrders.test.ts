// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOrders, useOrder, useCreateOrder, useUpdateOrder, useDeleteOrder, orderKeys } from '../useOrders';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';

// Mock dependencies
vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useQueryClient: vi.fn(() => ({
        invalidateQueries: vi.fn(),
    })),
    useInfiniteQuery: vi.fn(),
}));

vi.mock('react', () => ({
    ...vi.requireActual('react'),
    useEffect: vi.fn((cb) => {
        // execute effect body for coverage, but mock cleanup
        const cleanup = cb();
        if (typeof cleanup === 'function') {
            cleanup();
        }
    }),
}));

vi.mock('../../services/apiService', () => ({
    apiService: {
        getOrders: vi.fn(),
        getOrder: vi.fn(),
        createOrder: vi.fn(),
        updateOrder: vi.fn(),
        deleteOrder: vi.fn(),
    }
}));

vi.mock('../../services/pb', () => ({
    pb: {
        collection: vi.fn(() => ({
            subscribe: vi.fn(() => vi.fn()), // returns unsubscribe function
        }))
    }
}));

describe('useOrders hooks structure', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('orderKeys', () => {
        it('generates correct query keys', () => {
            expect(orderKeys.all).toEqual(['orders', 'v2']);
            expect(orderKeys.lists()).toEqual(['orders', 'v2', 'list']);
            expect(orderKeys.detail('123')).toEqual(['orders', 'v2', 'detail', '123']);
        });
    });

    describe('useOrders', () => {
        it('calls useQuery with correct parameters', () => {
            renderHook(() => useOrders(1, 50, { status: 'pending' }));
            expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({
                queryKey: orderKeys.list('dashboard', { page: 1, limit: 50, status: 'pending' }),
            }));
            // also checks if useEffect was called for realtime subscription
            expect(useEffect).toHaveBeenCalled();
        });
    });

    describe('useOrder', () => {
        it('calls useQuery with correct parameters and is enabled when id exists', () => {
            renderHook(() => useOrder('123'));
            expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({
                queryKey: orderKeys.detail('123'),
                enabled: true,
            }));
        });
    });

    describe('Mutations', () => {
        it('useCreateOrder calls useMutation', () => {
            renderHook(() => useCreateOrder());
            expect(useMutation).toHaveBeenCalled();
        });

        it('useUpdateOrder calls useMutation', () => {
            renderHook(() => useUpdateOrder());
            expect(useMutation).toHaveBeenCalled();
        });

        it('useDeleteOrder calls useMutation', () => {
            renderHook(() => useDeleteOrder());
            expect(useMutation).toHaveBeenCalled();
        });
    });
});
