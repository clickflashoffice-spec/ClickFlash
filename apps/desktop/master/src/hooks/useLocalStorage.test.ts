// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from 'vitest';
/**
 * Unit tests for useLocalStorage hook
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';

// Mock safeStorage before importing the hook
vi.mock('../utils/safeStorage', () => ({
    safeStorage: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
    }
}));

import useLocalStorage from './useLocalStorage';
import { safeStorage } from '../utils/safeStorage';

const mockSafeStorage = safeStorage as vi.Mocked<typeof safeStorage>;

describe('useLocalStorage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSafeStorage.getItem.mockReturnValue(null);
    });

    it('should return initial value when localStorage is empty', () => {
        mockSafeStorage.getItem.mockReturnValue(null);

        const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));

        expect(result.current[0]).toBe('initialValue');
    });

    it('should return stored value when localStorage has data', () => {
        mockSafeStorage.getItem.mockReturnValue(JSON.stringify('storedValue'));

        const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));

        expect(result.current[0]).toBe('storedValue');
    });

    it('should update localStorage when value changes', () => {
        const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));

        act(() => {
            result.current[1]('newValue');
        });

        expect(mockSafeStorage.setItem).toHaveBeenCalledWith('testKey', JSON.stringify('newValue'));
        expect(result.current[0]).toBe('newValue');
    });

    it('should handle object values', () => {
        const initialObj = { foo: 'bar', count: 1 };
        const { result } = renderHook(() => useLocalStorage('testKey', initialObj));

        const newObj = { foo: 'baz', count: 2 };
        act(() => {
            result.current[1](newObj);
        });

        expect(mockSafeStorage.setItem).toHaveBeenCalledWith('testKey', JSON.stringify(newObj));
        expect(result.current[0]).toEqual(newObj);
    });

    it('should handle function updater', () => {
        const { result } = renderHook(() => useLocalStorage<number>('testKey', 0));

        act(() => {
            result.current[1]((prev) => prev + 1);
        });

        expect(result.current[0]).toBe(1);
    });
});
