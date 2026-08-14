// @ts-nocheck
/**
 * Vitest Setup for Master App Tests
 *
 * Configures the testing environment with necessary mocks and polyfills.
 * Migrated from Jest on 2026-06-14.
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: any) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: MockResizeObserver,
});

// Mock navigator.mediaDevices for camera access
Object.defineProperty(global.navigator, 'mediaDevices', {
    writable: true,
    value: {
        getUserMedia: vi.fn().mockResolvedValue({
            getTracks: () => [{ stop: vi.fn() }],
        }),
    },
});

// Suppress console errors/warnings during tests
global.console = {
    ...console,
    error: vi.fn(),
    warn: vi.fn(),
} as unknown as typeof console;

// Extend vitest matchers
// @ts-ignore
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeInTheDocument(): T;
    toHaveClass(className: string): T;
    toBeDisabled(): T;
  }
  interface AsymmetricMatchersContaining {
    toBeInTheDocument(): any;
    toHaveClass(className: string): any;
    toBeDisabled(): any;
  }
}
