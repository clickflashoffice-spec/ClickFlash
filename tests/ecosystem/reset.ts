import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * ClickFlash Ecosystem Reset Script
 * Prepare the environment for a clean E2E test run.
 */

const BASE_DIR = process.cwd();
const APPS = ['master', 'touch', 'management', 'gallery', 'website', 'moneytrash'];

import { SharedSeed } from './utils/SharedSeed';

async function reset() {
    console.log('--- ClickFlash Ecosystem Reset ---');

    // 1. Kill existing processes on standard ports
    const ports = [8090, 8091, 5173, 5174, 5175, 3000, 3001, 1883, 1420];
    console.log(`Checking ports: ${ports.join(', ')}...`);
    
    for (const port of ports) {
        try {
            if (process.platform === 'win32') {
                // Find and kill process on port
                const stdout = execSync(`netstat -ano | findstr :${port}`).toString();
                const lines = stdout.split('\n');
                for (const line of lines) {
                    if (line.includes('LISTENING')) {
                        const pid = line.trim().split(/\s+/).pop();
                        if (pid) {
                            console.log(`Killing process ${pid} on port ${port}...`);
                            execSync(`taskkill /F /PID ${pid}`);
                        }
                    }
                }
            } else {
                execSync(`lsof -t -i:${port} | xargs kill -9`, { stdio: 'ignore' });
            }
        } catch (e) {
            // Port likely not in use
        }
    }

    // 2. Clear localized data
    const dataDirs = [
        path.join(BASE_DIR, 'apps/master/pb_data'),
        path.join(BASE_DIR, 'apps/touch/pb_data'),
        path.join(BASE_DIR, 'apps/management/pb_data'), // If exists
    ];

    console.log('Cleaning data directories...');
    for (const dir of dataDirs) {
        if (fs.existsSync(dir)) {
            console.log(`Deleting ${dir}...`);
            try {
                fs.rmSync(dir, { recursive: true, force: true });
                fs.mkdirSync(dir, { recursive: true });
            } catch (err: any) {
                console.warn(`Could not fully clean ${dir}: ${err.message}`);
            }
        }
    }

    // 3. Environment Variable Sanity Check
    console.log('Verifying .env files...');
    const masterEnv = path.join(BASE_DIR, 'apps/master/.env');
    if (!fs.existsSync(masterEnv)) {
        console.error('FATAL: apps/master/.env is missing! Tests will fail.');
        process.exit(1);
    }

    // 4. Seed databases
    await SharedSeed.resetEcosystem();

    console.log('--- Reset Complete ---');
}

reset();
