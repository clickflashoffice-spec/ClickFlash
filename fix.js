const fs = require('fs');
const files = ['CeoAgent.ts', 'HotspotAgent.ts', 'PricingAgent.ts', 'SpyAgent.ts', 'StaffingAgent.ts'];
files.forEach(f => {
  const p = 'c:/Users/alamo/Desktop/ClickFlash/apps/management/src/agents/' + f;
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace('import { GeminiClient } from "@clickflash/ai";`nconst aiClient = new GeminiClient({ apiKey: "demo-api-key" });', 'import { GeminiClient } from "@clickflash/ai";\nconst aiClient = new GeminiClient({ apiKey: "demo-api-key" });');
  c = c.replace('const response = await aiClient.generateText(prompt);`n    return response.text;', 'const response = await aiClient.generateText({prompt});\n    return response.text;');
  fs.writeFileSync(p, c);
});
