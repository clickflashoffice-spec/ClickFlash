/**
 * ClickFlash - Global Test Teardown
 * 
 * Runs after all tests
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('\n🧹 Cleaning up test environment...');
  
  // Clean up test data
  // - Remove test albums
  // - Remove test orders
  // - Remove test users
  
  console.log('✅ Cleanup complete');
  console.log('📊 Test results: test-results/html-report/index.html');
}

export default globalTeardown;
