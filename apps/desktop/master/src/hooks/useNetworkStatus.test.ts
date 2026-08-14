/**
 * Unit tests for useNetworkStatus hook
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';

// Mock networkManager before importing the hook
const mockUnsubscribe = jest.fn();
const mockSubscribe = jest.fn(() => mockUnsubscribe);
const mockCheckNetworkQuality = jest.fn();
const mockGetState = jest.fn(() => ({
    isOnline: true,
    quality: 'excellent' as const,
    latency: 50,
    lastChecked: new Date()
}));

jest.mock('../services/networkManager', () => ({
    networkManager: {
        getState: mockGetState,
        subscribe: mockSubscribe,
        checkNetworkQuality: mockCheckNetworkQuality
    }
}));

import { useNetworkStatus } from './useNetworkStatus';

describe('useNetworkStatus', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return initial network state', () => {
        const { result } = renderHook(() => useNetworkStatus());

        expect(result.current.isOnline).toBe(true);
        expect(result.current.quality).toBe('excellent');
        expect(result.current.latency).toBe(50);
        expect(mockGetState).toHaveBeenCalled();
    });

    it('should subscribe to network changes on mount', () => {
        renderHook(() => useNetworkStatus());

        expect(mockSubscribe).toHaveBeenCalledTimes(1);
        expect(mockSubscribe).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should unsubscribe on unmount', () => {
        const { unmount } = renderHook(() => useNetworkStatus());

        unmount();

        expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('should update state when network changes', () => {
        const { result } = renderHook(() => useNetworkStatus());

        // Get the callback that was passed to subscribe
        const subscribeCallback = (mockSubscribe.mock.calls as any[][])[0][0] as (state: unknown) => void;

        // Simulate network change
        act(() => {
            subscribeCallback({
                isOnline: false,
                quality: 'poor',
                latency: 500,
                lastChecked: new Date()
            });
        });

        expect(result.current.isOnline).toBe(false);
        expect(result.current.quality).toBe('poor');
        expect(result.current.latency).toBe(500);
    });

    it('should expose checkNow function', () => {
        const { result } = renderHook(() => useNetworkStatus());

        act(() => {
            result.current.checkNow();
        });

        expect(mockCheckNetworkQuality).toHaveBeenCalledTimes(1);
    });
});
