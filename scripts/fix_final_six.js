const fs = require('fs');

// 1. cloudSyncService.ts
let cs = fs.readFileSync('apps/master/backend/services/cloudSyncService.ts', 'utf8');
// error TS6133
cs = cs.replace(/catch \(error: any\)/g, 'catch (_error: any)');
// Fix promise void assignability
cs = cs.replace(/public async pushData\(\): Promise<void> \{/g, 'public async pushData(): Promise<{ pushed: number; date: string; } | void> {');
fs.writeFileSync('apps/master/backend/services/cloudSyncService.ts', cs);

// 2. mdnsDiscovery.ts
let mdns = fs.readFileSync('apps/master/backend/services/mdnsDiscovery.ts', 'utf8');
// Fix mdns TS2722 (I previously tried if (bonjourInstance && bonjourInstance.destroy) bonjourInstance.destroy(); but maybe my regex failed)
mdns = mdns.replace(/bonjourInstance\?\.destroy\?\.?\(\);?/g, ''); // Let's just strip it and write it properly
mdns = mdns.replace(/if \(bonjourInstance && bonjourInstance\.destroy\) bonjourInstance\.destroy\(\);/g, ''); // strip previous
// Wait, I will just do exact line replacement
const mdnsLines = mdns.split('\n');
for (let i = 0; i < mdnsLines.length; i++) {
    if (mdnsLines[i].includes('bonjourInstance')) {
        if (mdnsLines[i].includes('destroy')) {
            mdnsLines[i] = '    if (bonjourInstance && typeof bonjourInstance.destroy === "function") { bonjourInstance.destroy(); }';
        }
    }
}
fs.writeFileSync('apps/master/backend/services/mdnsDiscovery.ts', mdnsLines.join('\n'));

// 3. WorkerPool.ts
let wp = fs.readFileSync('apps/master/backend/services/WorkerPool.ts', 'utf8');
// Fix unused info in loop
wp = wp.replace(/for \(const \[id, info\] of this\.activeWorkers\.entries\(\)\)/g, 'for (const [id, _info] of this.activeWorkers.entries())');
fs.writeFileSync('apps/master/backend/services/WorkerPool.ts', wp);

// 4. sync-integration.test.ts
let testPath = 'apps/master/backend/tests/sync-integration.test.ts';
let test = fs.readFileSync(testPath, 'utf8');
// Replace import { Database } from '../shared/db'; with import { DatabaseManager } from '../database/db';
test = test.replace(/import \{ Database \} from '\.\.\/shared\/db';/g, '');
test = test.replace(/import \{ Database \} from "\.\.\/shared\/db";/g, '');
// Since Database was never read, we just strip it
fs.writeFileSync(testPath, test);
