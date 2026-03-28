/**
 * Test Utilities for Touch App
 * 
 * Provides testing utilities for rendering components with providers,
 * mocking API calls, and creating test data.
 * 
 * Aligned with Master App implementation for consistency.
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KioskProvider } from '../context/KioskContext';
import { ThemeProvider } from '../components/ThemeContext';
import { CurrencyProvider } from '../components/CurrencyContext';

// Mock toast function for tests
const mockShowToast = jest.fn();

/**
 * Create a test QueryClient with default options
 */
export function createTestQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
                staleTime: 0,
            },
            mutations: {
                retry: false,
            },
        },
    });
}

/**
 * AllProviders wrapper for tests
 */
interface AllProvidersProps {
    children: React.ReactNode;
    queryClient?: QueryClient;
}

export function AllProviders({ children, queryClient = createTestQueryClient() }: AllProvidersProps): ReactElement {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <CurrencyProvider>
                    <KioskProvider showToast={mockShowToast}>
                        {children}
                    </KioskProvider>
                </CurrencyProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}

/**
 * Custom render function with providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    queryClient?: QueryClient;
}

export function renderWithProviders(
    ui: ReactElement,
    { queryClient, ...options }: CustomRenderOptions = {}
) {
    return render(ui, {
        wrapper: ({ children }) => (
            <AllProviders queryClient={queryClient}>{children}</AllProviders>
        ),
        ...options,
    });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { renderWithProviders as render };
export { mockShowToast };

/**
 * Test data factories
 */

export const createMockAlbum = (overrides = {}) => ({
    id: 'album-1',
    title: 'Test Album',
    date: new Date().toISOString(),
    photographerId: 1,
    coverPhotoUrl: '/test.jpg',
    photos: [],
    source: 'PB',
    roomNumber: '101',
    ...overrides,
});

export const createMockPhoto = (overrides = {}) => ({
    id: 'photo-1',
    title: 'Test Photo',
    url: '/test.jpg',
    albumId: 'album-1',
    photographerId: 1,
    category: 'Beach & Pool',
    ...overrides,
});

export const createMockOrder = (overrides = {}) => ({
    id: 'order-1',
    clientName: 'Test Client',
    email: 'test@example.com',
    total: 100,
    status: 'Pending' as const,
    items: [],
    date: new Date().toISOString(),
    photographerId: 1,
    ...overrides,
});

export const createMockOrderItem = (overrides = {}) => ({
    id: 'item-1',
    name: 'Test Product',
    format: '4x6 Print',
    quantity: 1,
    price: 25,
    ...overrides,
});

export const createMockProduct = (overrides = {}) => ({
    id: 'product-1',
    name: 'Test Product',
    category: 'Print' as const,
    price: 25,
    stock: 100,
    ...overrides,
});

export const createMockPack = (overrides = {}) => ({
    id: 'pack-1',
    name: 'Test Pack',
    description: 'Test pack description',
    price: 100,
    products: ['product-1'],
    ...overrides,
});

export const createMockKioskSettings = (overrides = {}) => ({
    logoUrl: '/logo.png',
    welcomeMessage: 'Welcome to ClickFlash!',
    kioskId: 'kiosk-test-123',
    currencyCode: 'USD',
    password: '',
    serverUrl: 'http://localhost:8090',
    screensaverTimeout: 60,
    enableRFID: true,
    enableFaceLogin: true,
    enableFaceSearch: true,
    ...overrides,
});

/**
 * API mocking utilities
 */

export function mockApiResponse<T>(data: T, delay = 0): Promise<T> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(data), delay);
    });
}

export function mockApiError(message: string, status = 500): Promise<never> {
    const error = new Error(message) as Error & { status?: number };
    error.status = status;
    return Promise.reject(error);
}

/**
 * Async test utilities
 */

export function waitForAsync(ms = 0): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Event simulation utilities
 */

export function createFile(name: string, type = 'image/jpeg', size = 1024): File {
    const blob = new Blob(['test'.repeat(size / 4)], { type });
    return new File([blob], name, { type });
}

export function createDragEvent(type: string, files: File[] = []): DragEvent {
    const event = new Event(type, { bubbles: true }) as DragEvent;
    Object.defineProperty(event, 'dataTransfer', {
        value: {
            files,
            items: files.map(file => ({ kind: 'file', getAsFile: () => file })),
            types: ['Files'],
        },
    });
    return event;
}

export function createTouchEvent(type: string, touches: TouchInit[] = []): TouchEvent {
    return new TouchEvent(type, {
        bubbles: true,
        touches: touches.map((t, i) => new Touch({
            identifier: i,
            target: document.body,
            ...t
        }))
    });
}

/**
 * Mock service worker utilities for API mocking
 */

export const mockHandlers = {
    // Add MSW handlers here when implemented
};

/**
 * Performance test utilities
 */

export function measureRenderTime(component: ReactElement): Promise<number> {
    const start = performance.now();
    const { unmount } = renderWithProviders(component);
    const end = performance.now();
    unmount();
    return Promise.resolve(end - start);
}

/**
 * LocalStorage mock utilities
 */

export function setupLocalStorageMock(): void {
    const store: Record<string, string> = {};
    
    Object.defineProperty(window, 'localStorage', {
        value: {
            getItem: jest.fn((key: string) => store[key] || null),
            setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
            removeItem: jest.fn((key: string) => { delete store[key]; }),
            clear: jest.fn(() => { Object.keys(store).forEach(key => delete store[key]); }),
        },
        writable: true
    });
}

/**
 * MatchMedia mock for responsive component tests
 */

export function setupMatchMediaMock(matches = false): void {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
            matches,
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        })),
    });
}
