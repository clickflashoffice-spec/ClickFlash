import { vi } from 'vitest';
export const mockCollection = {
    getFullList: vi.fn(),
    getOne: vi.fn(),
    getFirstListItem: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getList: vi.fn(),
};

export const pb = {
    collection: vi.fn(() => mockCollection),
    baseUrlValue: 'http://localhost:8090',
    authStore: {
        token: 'mock-token',
        isValid: true,
        clear: vi.fn(),
    },
    getCsrfToken: vi.fn().mockResolvedValue('mock-csrf-token'),
};

export const resetPbMocks = () => {
    vi.clearAllMocks();
    mockCollection.getFullList.mockReset();
    mockCollection.getOne.mockReset();
    mockCollection.getFirstListItem.mockReset();
    mockCollection.create.mockReset();
    mockCollection.update.mockReset();
    mockCollection.delete.mockReset();
    mockCollection.getList.mockReset();
};
