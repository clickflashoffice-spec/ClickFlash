/**
 * Mock PocketBase service for Jest tests
 * Prevents import.meta.env syntax errors
 */

export const pb = {
  collection: () => ({
    getList: jest.fn(),
    getOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  }),
  authStore: {
    token: '',
    model: null,
    isValid: jest.fn(() => false),
    onChange: jest.fn(),
  },
  authWithPassword: jest.fn(),
  authRefresh: jest.fn(),
  logout: jest.fn(),
};

export default pb;
