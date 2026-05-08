import { test as base, ElectronApplication, _electron } from '@playwright/test';
import path from 'path';

export interface ElectronPage {
  electron: ElectronApplication;
  window: import('electron').BrowserWindow;
}

export interface TestFixtures {
  electronApp: ElectronApplication;
  electronPage: import('electron').Page;
}

export const test = base.extend<TestFixtures>({
  electronApp: async ({}, use) => {
    const electronPath = process.env.ELECTRON_PATH || 
      path.join(__dirname, '../../node_modules/.bin/electron');
    
    let app: ElectronApplication | undefined;
    
    try {
      app = await _electron.launch({
        executablePath: electronPath,
        args: [path.join(__dirname, '../../dist/main/index.js')],
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
      });
      
      await use(app);
    } finally {
      if (app) {
        await app.close();
      }
    }
  },
  
  electronPage: async ({ electronApp }, use) => {
    const page = await electronApp.newPage();
    await use(page);
  },
});

export { expect } from '@playwright/test';
