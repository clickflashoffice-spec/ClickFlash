/**
 * Unit Tests for useDebounce Hook
 */

import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
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

    // Change the value
    rerender({ value: 'changed', delay: 500 });
    
    // Value should still be initial (not debounced yet)
    expect(result.current).toBe('initial');

    // Fast-forward past the delay
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Now value should be updated
    expect(result.current).toBe('changed');
  });

  it('should reset timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    // First change
    rerender({ value: 'change1', delay: 500 });
    
    // Advance partially
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    // Second change
    rerender({ value: 'change2', delay: 500 });
    
    // Advance remaining time of first delay
    act(() => {
      jest.advanceTimersByTime(200);
    });
    
    // Should still be initial (timer was reset)
    expect(result.current).toBe('initial');
    
    // Advance full second delay
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    // Now should be change2
    expect(result.current).toBe('change2');
  });

  it('should handle number values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 300 } }
    );

    rerender({ value: 100, delay: 300 });
    
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    expect(result.current).toBe(100);
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useDebounce('value', 500));
    
    // Should not throw when unmounting
    expect(() => unmount()).not.toThrow();
  });
});
