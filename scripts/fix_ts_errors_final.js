const fs = require('fs');

// 1. Fix server.ts (remove unused imports and fix duplicates)
let server = fs.readFileSync('apps/master/backend/server.ts', 'utf8');
server = server.replace(/import \{ strictRateLimiter.*?\n/g, '');
server = server.replace(/import \{ initDefaultUser.*?\n/g, '');
server = server.replace(/import \{ tunnelService.*?\n/g, '');
server = server.replace(/import startFolderMonitor.*?\n/g, '');
server = server.replace(/import MaintenanceService.*?\n/g, '');
server = server.replace(/import \{ BootstrapService.*?\n/g, '');
server = server.replace(/import startOrderWatcher.*?\n/g, '');
server = server.replace(/import AuditService.*?\n/g, '');
server = server.replace(/import \{ faceIndexingWorker.*?\n/g, '');
server = server.replace(/import \{ initCsrfTokenStore \} from "\.\/middleware\/csrf";\n/g, '');
// Clean up any remaining double csrf imports
server = server.replace(/import \{ initCsrfTokenStore \} from "\.\/utils\/csrfStore";\nimport \{ csrfMiddleware \} from "\.\/middleware\/csrf";\nimport \{ initCsrfTokenStore \} from "\.\/utils\/csrfStore";/g, 'import { initCsrfTokenStore } from "./utils/csrfStore";\nimport { csrfMiddleware } from "./middleware/csrf";');
fs.writeFileSync('apps/master/backend/server.ts', server);

// 2. Fix healthCheck.ts
let hc = fs.readFileSync('apps/master/backend/middleware/healthCheck.ts', 'utf8');
hc = hc.replace(/import path from "path";\n?/g, '');
hc = hc.replace(/import \* as path from "path";\n?/g, '');
hc = hc.replace(/const path = require\("path"\);\n?/g, '');
hc = hc.replace(/export const healthCheckMiddleware = async \(req: Request, res: Response\)/g, 'export const healthCheckMiddleware = async (_req: Request, res: Response)');
hc = hc.replace(/\(req: Request, res: Response\)/g, '(_req: Request, res: Response)');
fs.writeFileSync('apps/master/backend/middleware/healthCheck.ts', hc);

// 3. Fix WorkerPool.ts
let wp = fs.readFileSync('apps/master/backend/services/WorkerPool.ts', 'utf8');
wp = wp.replace(/const _info = /g, 'const info = ');
wp = wp.replace(/const info = /g, 'const info = ');
wp = wp.replace(/catch \(err\)/g, 'catch (err: any)');
// Wait, TS6133 means info is declared but never read. It seems the compiler says `info` is declared but its value is never read on line 65?
// Actually if I look at line 65, it was:
// const info = ...
// But it was NEVER read! So I should just delete `const info = `
wp = wp.replace(/const _info = /g, '');
wp = wp.replace(/const info = /g, '');
fs.writeFileSync('apps/master/backend/services/WorkerPool.ts', wp);

// 4. Fix cloudSyncService.ts
let cs = fs.readFileSync('apps/master/backend/services/cloudSyncService.ts', 'utf8');
cs = cs.replace(/catch \(error\)/g, 'catch (_error)');
cs = cs.replace(/catch \(error: any\)/g, 'catch (_error: any)');
// Fix promise mismatch by changing the implementation return value
cs = cs.replace(/return \{ pushed: \d+, date: .*? \};/g, 'return;');
fs.writeFileSync('apps/master/backend/services/cloudSyncService.ts', cs);

// 5. Fix mdnsDiscovery.ts
let mdns = fs.readFileSync('apps/master/backend/services/mdnsDiscovery.ts', 'utf8');
mdns = mdns.replace(/bonjourInstance\.destroy\(\);/g, 'bonjourInstance?.destroy();');
fs.writeFileSync('apps/master/backend/services/mdnsDiscovery.ts', mdns);

// 6. Fix csrfStore.ts
let csrf = fs.readFileSync('apps/master/backend/utils/csrfStore.ts', 'utf8');
csrf = csrf.replace(/from '\.\/db';/g, "from '../database/db';");
fs.writeFileSync('apps/master/backend/utils/csrfStore.ts', csrf);

