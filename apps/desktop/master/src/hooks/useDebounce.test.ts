// @vitest-environment jsdom
import { vi, describe, it, test, expect, beforeEach, afterEach } from 'vitest';
/**
 * Unit tests for useDebounce hook
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return initial value immediately', () => {
        const { result } = renderHook(() => useDebounce('initial', 500));

        expect(result.current).toBe('initial');
    });

    it('should debounce value changes', () => {
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 'initial', delay: 500 } }
        );

        // Value should be initial
        expect(result.current).toBe('initial');

        // Update value
        rerender({ value: 'updated', delay: 500 });

        // Value should still be initial (debouncing)
        expect(result.current).toBe('initial');

        // Fast-forward time
        act(() => {
            vi.advanceTimersByTime(500);
        });

        // Now value should be updated
        expect(result.current).toBe('updated');
    });

    it('should reset timer on rapid changes', () => {
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 'v1', delay: 300 } }
        );

        // Rapid changes
        rerender({ value: 'v2', delay: 300 });
        act(() => {
            vi.advanceTimersByTime(100);
        });

        rerender({ value: 'v3', delay: 300 });
        act(() => {
            vi.advanceTimersByTime(100);
        });

        rerender({ value: 'v4', delay: 300 });

        // Still should be v1 due to debounce reset
        expect(result.current).toBe('v1');

        // Wait full delay
        act(() => {
            vi.advanceTimersByTime(300);
        });

        // Now should be final value
        expect(result.current).toBe('v4');
    });

    it('should handle different delay values', () => {
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 'test', delay: 1000 } }
        );

        rerender({ value: 'changed', delay: 1000 });

        // Advance 500ms - should still be debouncing
        act(() => {
            vi.advanceTimersByTime(500);
        });
        expect(result.current).toBe('test');

        // Advance remaining 500ms
        act(() => {
            vi.advanceTimersByTime(500);
        });
        expect(result.current).toBe('changed');
    });
});
