/**
 * Test Utilities for Master App
 * 
 * Provides testing utilities for rendering components with providers,
 * mocking API calls, and creating test data.
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { SyncProvider } from '../context/SyncContext';

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
            <AuthProvider>
                <ToastProvider>
                    <SyncProvider>
                        {children}
                    </SyncProvider>
                </ToastProvider>
            </AuthProvider>
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

/**
 * Test data factories
 */

export const createMockAlbum = (overrides = {}) => ({
    id: 'album-1',
    title: 'Test Album',
    date: new Date().toISOString(),
    photographerId: 'photo-1',
    coverPhotoUrl: '/test.jpg',
    status: 'Draft',
    photos: [],
    ...overrides,
});

export const createMockPhoto = (overrides = {}) => ({
    id: 'photo-1',
    title: 'Test Photo',
    url: '/test.jpg',
    thumbnailUrl: '/test-thumb.jpg',
    albumId: 'album-1',
    photographerId: 'photo-1',
    ...overrides,
});

export const createMockOrder = (overrides = {}) => ({
    id: 'order-1',
    clientName: 'Test Client',
    email: 'test@example.com',
    total: 100,
    status: 'Pending',
    items: [],
    ...overrides,
});

export const createMockPhotographer = (overrides = {}) => ({
    id: 'photo-1',
    name: 'Test Photographer',
    email: 'photographer@example.com',
    role: 'photographer',
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
    return Promise.reject(new Error(message));
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
    const blob = new Blob(['test'], { type });
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
