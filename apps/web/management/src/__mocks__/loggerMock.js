/**
 * Mock logger for Jest tests
 * Prevents import.meta.env syntax errors
 */

export const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  payment: jest.fn(),
  security: jest.fn(),
};

export default logger;
