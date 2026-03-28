/**
 * Global setup for E2E tests
 * Ensures backend is healthy before running tests
 */

import { execSync } from 'child_process';

async function globalSetup() {
  console.log('[E2E Setup] Starting global setup...');
  
  // Kill any existing node processes to ensure clean state
  try {
    if (process.platform === 'win32') {
      execSync('taskkill /F /IM node.exe 2>nul', { stdio: 'ignore' });
    }
  } catch {
    // Ignore errors if no processes to kill
  }
  
  // Wait for processes to terminate
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('[E2E Setup] Global setup complete');
}

export default globalSetup;
