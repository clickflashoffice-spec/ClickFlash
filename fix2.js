const fs = require('fs');
const files = ['CeoAgent.ts', 'HotspotAgent.ts', 'PricingAgent.ts', 'SpyAgent.ts', 'StaffingAgent.ts'];
files.forEach(f => {
  const p = 'c:/Users/alamo/Desktop/ClickFlash/apps/management/src/agents/' + f;
  let c = fs.readFileSync(p, 'utf8');
  // Revert the previous bad replacement if needed, or just rewrite the exact content since they are small files.
});
