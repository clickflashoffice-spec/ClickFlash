const fs = require('fs');

// 1. cloudSyncService.ts (Revert catch)
let cs = fs.readFileSync('apps/master/backend/services/cloudSyncService.ts', 'utf8');
cs = cs.replace(/catch \(_(e|err|error)\)/g, 'catch ($1)');
cs = cs.replace(/catch \(_(e|err|error): any\)/g, 'catch ($1: any)');
// Specific fix for TS6133 'error' never read in line 559
// Actually we can just do // @ts-ignore or remove it
cs = cs.replace(/catch \(error\)/g, 'catch (error: any)');
fs.writeFileSync('apps/master/backend/services/cloudSyncService.ts', cs);

// 2. server.ts
let server = fs.readFileSync('apps/master/backend/server.ts', 'utf8');
const linesServer = server.split('\n').filter(l => !l.includes('FaceIndexingWorker'));
fs.writeFileSync('apps/master/backend/server.ts', linesServer.join('\n'));

// 3. sync-integration.test.ts
// I removed lines with 'Database', so 'const db = new Database()' was removed!
// Let's just find and replace in the test:
let test = fs.readFileSync('apps/master/backend/tests/sync-integration.test.ts', 'utf8');
// This is too hard to guess. Let's just git checkout sync-integration.test.ts!

// 4. mdnsDiscovery.ts
let mdns = fs.readFileSync('apps/master/backend/services/mdnsDiscovery.ts', 'utf8');
mdns = mdns.replace(/bonjourInstance\?\.destroy\?\.\(\);/g, 'if (bonjourInstance && bonjourInstance.destroy) bonjourInstance.destroy();');
fs.writeFileSync('apps/master/backend/services/mdnsDiscovery.ts', mdns);

// 5. WorkerPool.ts
let wp = fs.readFileSync('apps/master/backend/services/WorkerPool.ts', 'utf8');
// Fix missing info variable
wp = wp.replace(/const _info = /g, 'const info = ');
wp = wp.replace(/for \(const \[id, _info\] of this.activeWorkers.entries\(\)\) \{/g, 'for (const [id, info] of this.activeWorkers.entries()) {');
fs.writeFileSync('apps/master/backend/services/WorkerPool.ts', wp);

// 6. photoProcessor.test.ts
let ppTest = fs.readFileSync('apps/master/backend/services/photoProcessor.test.ts', 'utf8');
ppTest = ppTest.replace(/job => \{/g, '() => {').replace(/\(job\) =>/g, '() =>');
fs.writeFileSync('apps/master/backend/services/photoProcessor.test.ts', ppTest);
