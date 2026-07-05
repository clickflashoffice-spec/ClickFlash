const fs = require('fs');

// 1. Fix healthCheck.ts
let hc = fs.readFileSync('apps/master/backend/middleware/healthCheck.ts', 'utf8');
hc = hc.replace(/..\/shared\/db/g, '../database/db');
hc = hc.replace(/..\/shared\/logger/g, '../utils/logger');
hc = hc.replace(/import path from 'path';/g, ''); // remove unused path
hc = hc.replace(/export const healthCheckMiddleware = async \(req: Request, res: Response\) =>/g, 'export const healthCheckMiddleware = async (_req: Request, res: Response) =>');
fs.writeFileSync('apps/master/backend/middleware/healthCheck.ts', hc);

// 2. Fix cloudSyncService.ts
let cs = fs.readFileSync('apps/master/backend/services/cloudSyncService.ts', 'utf8');
cs = cs.replace(/catch \(error\) \{/g, 'catch (_error) {');
cs = cs.replace(/public async pushData\(\): Promise<void> \{/g, 'public async pushData(): Promise<{ pushed: number; date: string; } | void> {');
fs.writeFileSync('apps/master/backend/services/cloudSyncService.ts', cs);

// 3. Fix mdnsDiscovery.ts
let mdns = fs.readFileSync('apps/master/backend/services/mdnsDiscovery.ts', 'utf8');
mdns = mdns.replace(/bonjourInstance\.destroy\(\);/g, 'bonjourInstance?.destroy();');
fs.writeFileSync('apps/master/backend/services/mdnsDiscovery.ts', mdns);

// 4. Fix WorkerPool.ts
let wp = fs.readFileSync('apps/master/backend/services/WorkerPool.ts', 'utf8');
wp = wp.replace(/const info = /g, 'const _info = ');
fs.writeFileSync('apps/master/backend/services/WorkerPool.ts', wp);

// 5. Fix bootstrap.ts
let bs = fs.readFileSync('apps/master/backend/setup/bootstrap.ts', 'utf8');
bs = bs.replace(/import \{ MaintenanceService \} from "\.\.\/services\/maintenanceService";/g, 'import MaintenanceService from "../services/maintenanceService";');
fs.writeFileSync('apps/master/backend/setup/bootstrap.ts', bs);

// 6. Fix sync-integration.test.ts
let testFile = 'apps/master/backend/tests/sync-integration.test.ts';
if (fs.existsSync(testFile)) {
  let tf = fs.readFileSync(testFile, 'utf8');
  tf = tf.replace(/import \{ Database \} from "\.\.\/database\/db";\n?/g, ''); // or whatever it imports
  fs.writeFileSync(testFile, tf);
}
