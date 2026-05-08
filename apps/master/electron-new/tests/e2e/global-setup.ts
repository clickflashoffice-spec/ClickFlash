import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function globalSetup() {
  const projectRoot = path.resolve(__dirname, '../..');
  const distDir = path.join(projectRoot, 'dist');
  const mainIndex = path.join(distDir, 'main/index.js');
  
  if (!fs.existsSync(mainIndex)) {
    console.warn('[E2E Setup] dist/main/index.js not found. Building...');
    const { execSync } = require('child_process');
    execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
  }
  
  const backendPort = 8090;
  const healthUrl = `http://localhost:${backendPort}/api/health`;
  
  console.log('[E2E Setup] Waiting for backend health check...');
  const maxWait = 60000;
  const start = Date.now();
  
  while (Date.now() - start < maxWait) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        console.log('[E2E Setup] Backend is healthy');
        break;
      }
    } catch {
      // Backend not ready yet
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('[E2E Setup] Global setup complete');
}

export default globalSetup;
