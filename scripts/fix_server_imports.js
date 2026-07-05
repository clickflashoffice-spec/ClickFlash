const fs = require('fs');
let c = fs.readFileSync('apps/master/backend/server.ts', 'utf8');

c = c.replace(/.\/shared\/rateLimiter/g, './middleware/rateLimiter');
c = c.replace(/.\/shared\/networkDetection/g, './services/networkDetection');
c = c.replace(/.\/shared\/auditLogger/g, './utils/auditLogger');
c = c.replace(/.\/shared\/photoProcessor/g, './services/photoProcessor');
c = c.replace(/.\/shared\/thermalService/g, './services/thermalService');
c = c.replace(/.\/shared\/ResourceMonitor/g, './services/ResourceMonitor');
c = c.replace(/.\/shared\/tokenRefresh/g, './middleware/tokenRefresh');

// Replace csrf middleware properly
c = c.replace(/import { csrfMiddleware } from ".\/middleware\/csrf";/, 'import { initCsrfTokenStore } from "./utils/csrfStore";\nimport { csrfMiddleware } from "./middleware/csrf";');

// Fix AuditService casing
c = c.replace(/.\/services\/AuditService/g, './services/auditService');

fs.writeFileSync('apps/master/backend/server.ts', c);
