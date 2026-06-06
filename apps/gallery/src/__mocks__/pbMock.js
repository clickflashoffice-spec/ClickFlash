/**
 * Mock for PocketBase service (pb.ts)
 * Prevents import.meta.env syntax errors in Jest
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

export const isCloudMode = true;
export default pb;
