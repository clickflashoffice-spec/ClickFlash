// watchdog.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Rule 16: Watchdog Service
// Monitors the main app PID and forces a restart if a crash is detected.

const APP_SCRIPT = path.join(__dirname, 'backend', 'server.ts'); // Or compiled .js
const MAX_RESTARTS = 5;
let restartCount = 0;

function startApp() {
    console.log('[Watchdog] Starting Touch App...');

    // Using ts-node for dev/source environment, or node for prod
    const isTs = fs.existsSync(APP_SCRIPT);
    const cmd = isTs ? 'npx' : 'node';
    const args = isTs ? ['ts-node', APP_SCRIPT] : ['backend/server.js'];

    const app = spawn(cmd, args, {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, FROM_WATCHDOG: 'true' }
    });

    app.on('exit', (code) => {
        console.warn(`[Watchdog] App exited with code ${code}`);
        if (code !== 0) {
            restartCount++;
            if (restartCount < MAX_RESTARTS) {
                console.log(`[Watchdog] Restarting in 2s... (${restartCount}/${MAX_RESTARTS})`);
                setTimeout(startApp, 2000);
            } else {
                console.error('[Watchdog] Max restarts exceeded. Giving up.');
                process.exit(1);
            }
        } else {
            console.log('[Watchdog] App exited cleanly.');
            process.exit(0);
        }
    });

    app.on('error', (err) => {
        console.error('[Watchdog] Failed to spawn app:', err);
    });
}

startApp();
