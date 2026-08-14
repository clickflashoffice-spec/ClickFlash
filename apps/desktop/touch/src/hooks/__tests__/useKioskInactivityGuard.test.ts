import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useKioskInactivityGuard } from '../useKioskInactivityGuard';

describe('useKioskInactivityGuard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start warning before timeout and trigger onTimeout when expired', () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() =>
      useKioskInactivityGuard({
        idleTimeoutMs: 30000,
        warningWindowMs: 5000,
        onTimeout,
      })
    );

    expect(result.current.showWarning).toBe(false);

    // Advance 25 seconds -> warning window starts
    act(() => {
      vi.advanceTimersByTime(25000);
    });

    expect(result.current.showWarning).toBe(true);
    expect(onTimeout).not.toHaveBeenCalled();

    // Advance remaining 5 seconds
    act(() => {
      vi.advanceTimersByTime(5100);
    });

    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(result.current.showWarning).toBe(false);
  });

  it('should allow keepSessionAlive to cancel the warning', () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() =>
      useKioskInactivityGuard({
        idleTimeoutMs: 30000,
        warningWindowMs: 5000,
        onTimeout,
      })
    );

    act(() => {
      vi.advanceTimersByTime(25000);
    });

    expect(result.current.showWarning).toBe(true);

    act(() => {
      result.current.keepSessionAlive();
    });

    expect(result.current.showWarning).toBe(false);

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(onTimeout).not.toHaveBeenCalled();
  });
});
