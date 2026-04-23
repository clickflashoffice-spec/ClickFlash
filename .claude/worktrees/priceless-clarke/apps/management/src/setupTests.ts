/**
 * Test Setup for Management App
 * 
 * Configures Jest and React Testing Library for component testing.
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// Clean up after each test
afterEach(() => {
    cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
    observe = jest.fn();
    disconnect = jest.fn();
    unobserve = jest.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
    observe = jest.fn();
    disconnect = jest.fn();
    unobserve = jest.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: MockResizeObserver,
});

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
});

// @ts-ignore - Mock fetch
globalThis.fetch = jest.fn();

// Suppress console errors during tests (optional)
const originalError = console.error;
beforeAll(() => {
    console.error = (...args: unknown[]) => {
        // Filter out React act() warnings
        if (typeof args[0] === 'string' && args[0].includes('act')) {
            return;
        }
        originalError.call(console, ...args);
    };
});

afterAll(() => {
    console.error = originalError;
});
