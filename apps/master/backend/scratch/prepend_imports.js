const fs = require('fs');
let c = fs.readFileSync('services/cloudSyncService.ts', 'utf8');
const imports = `import { SyncContext } from "./sync/types";
import { OperationLogsPipeline } from "./sync/pipelines/OperationLogsPipeline";
import { LedgerPipeline } from "./sync/pipelines/LedgerPipeline";
import { AnalyticsPipeline } from "./sync/pipelines/AnalyticsPipeline";
import { ExpensesPipeline } from "./sync/pipelines/ExpensesPipeline";
import { InventoryPipeline } from "./sync/pipelines/InventoryPipeline";
import { HeartbeatPipeline } from "./sync/pipelines/HeartbeatPipeline";
import { OrdersPipeline } from "./sync/pipelines/OrdersPipeline";
`;
c = imports + c;
// Remove handleFailedOperations which is unused
c = c.replace(/private handleFailedOperations[\s\S]*?}\n/, '');
fs.writeFileSync('services/cloudSyncService.ts', c);
