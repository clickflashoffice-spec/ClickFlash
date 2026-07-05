const fs = require('fs');

let server = fs.readFileSync('apps/master/backend/server.ts', 'utf8');

// 1. Fix rateLimiter
server = server.replace(/import rateLimiter, \{\s*strictRateLimiter,\s*userRateLimiter,\s*setAuditLogger as setRateLimiterAuditLogger,\s*\} from "\.\/middleware\/rateLimiter";/g, 'import rateLimiter, { userRateLimiter, setAuditLogger as setRateLimiterAuditLogger } from "./middleware/rateLimiter";');

// 2. Remove unused imports
server = server.replace(/import \{ initDefaultUser \} from "\.\/setup\/init-default-user";\n/g, '');
server = server.replace(/import \{ tunnelService \} from "\.\/services\/tunnelService";\n/g, '');
server = server.replace(/import startFolderMonitor from "\.\/services\/folderMonitor";\n/g, '');
server = server.replace(/import MaintenanceService from "\.\/services\/maintenanceService";\n/g, '');
server = server.replace(/import \{ BootstrapService \} from "\.\.\/services\/provisioning\/BootstrapService";\n/g, '');
server = server.replace(/import startOrderWatcher from "\.\/services\/orderWatcher";\n/g, '');
server = server.replace(/import AuditService from "\.\/services\/auditService";\n/g, '');
server = server.replace(/import \{ faceIndexingWorker \} from "\.\/services\/ai\/FaceIndexingWorker";\n/g, '');

// 3. Fix duplicate initCsrfTokenStore
server = server.replace(/import \{ initCsrfTokenStore \} from "\.\/middleware\/csrf";\n/g, '');

fs.writeFileSync('apps/master/backend/server.ts', server);

