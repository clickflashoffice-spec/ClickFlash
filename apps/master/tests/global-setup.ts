import { jest } from '@jest/globals';

export const globalSetup = async () => {
  console.log('[Global Setup] Starting test environment...');
  
  process.env.NODE_ENV = 'test';
  process.env.JEST_WORKER_ID = String(process.env.JEST_WORKER_ID || 1);
  
  console.log('[Global Setup] Test environment initialized');
};

export default globalSetup;
