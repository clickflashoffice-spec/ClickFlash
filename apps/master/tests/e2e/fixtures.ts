import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { _electron } from '@playwright/test';
import path from 'path';

export interface ElectronFixtures {
  electronApp: ElectronApplication;
  page: Page;
}

export const electronTest = test.extend<ElectronFixtures>({
  electronApp: async ({}, use) => {
    const electronPath = process.env.ELECTRON_PATH || 
      path.join(__dirname, '../../../node_modules/.bin/electron');
    
    let app: ElectronApplication | undefined;
    
    try {
      app = await _electron.launch({
        executablePath: electronPath,
        args: [path.join(__dirname, '../../../dist/main/index.js')],
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
        timeout: 30000,
      });
      
      await use(app);
    } finally {
      if (app) {
        await app.close();
      }
    }
  },
  
  page: async ({ electronApp }, use) => {
    const page = await electronApp.newPage();
    await use(page);
  },
});

export { expect } from '@playwright/test';
