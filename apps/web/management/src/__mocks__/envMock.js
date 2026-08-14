/**
 * Mock env module for Jest tests
 * Prevents import.meta.env syntax errors
 */

export const getEnv = jest.fn(() => ({
  VITE_LOG_LEVEL: 'INFO',
  DEV: true,
  MODE: 'test',
  VITE_API_BASE_URL: 'http://localhost:8090',
  VITE_APP_TITLE: 'Star Master Management'
}));

export default getEnv;
