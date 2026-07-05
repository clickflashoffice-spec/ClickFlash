/**
 * ClickFlash - Global Test Setup
 * 
 * Runs before all tests
 */

import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting ClickFlash test suite...');
  
  // Check if required services are running
  const services = [
    { name: 'Master', url: 'http://localhost:8090/api/health' },
    { name: 'Touch', url: 'http://localhost:8091/api/health' },
    { name: 'Website', url: 'https://clickflash-website.pages.dev' },
  ];
  
  for (const service of services) {
    try {
      const response = await fetch(service.url);
      console.log(`  ✅ ${service.name}: ${response.status === 200 ? 'Online' : 'Status ' + response.status}`);
    } catch (error) {
      console.log(`  ⚠️  ${service.name}: Not running (tests will skip)`);
    }
  }
  
  console.log('✅ Global setup complete\n');
}

export default globalSetup;
