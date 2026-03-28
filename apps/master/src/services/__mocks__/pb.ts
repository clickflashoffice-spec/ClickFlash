export const mockCollection = {
    getFullList: jest.fn(),
    getOne: jest.fn(),
    getFirstListItem: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getList: jest.fn(),
};

export const pb = {
    collection: jest.fn(() => mockCollection),
    baseUrlValue: 'http://localhost:8090',
    authStore: {
        token: 'mock-token',
        isValid: true,
        clear: jest.fn(),
    },
};

export const resetPbMocks = () => {
    jest.clearAllMocks();
    mockCollection.getFullList.mockReset();
    mockCollection.getOne.mockReset();
    mockCollection.getFirstListItem.mockReset();
    mockCollection.create.mockReset();
    mockCollection.update.mockReset();
    mockCollection.delete.mockReset();
    mockCollection.getList.mockReset();
};
