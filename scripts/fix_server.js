const fs = require('fs');

const serverFile = 'c:/Users/alamo/Desktop/ClickFlash/apps/master/backend/server.ts';
let content = fs.readFileSync(serverFile, 'utf8');

// 1. Remove all the old route imports
content = content.replace(/\/\/ Routes[\s\S]+?\/\/ Services/, '// Routes\nimport { mountRoutes } from "./setup/routes";\nimport { initializeEcosystem } from "./setup/bootstrap";\n\n// Services');

// 2. Replace the massive route mounting block
const routeMountStart = '// --- Routes Mounting ---';
const routeMountEnd = '// Error handling middleware — ApiError';

const newRouteMount = `// --- Routes Mounting ---
mountRoutes(app, context);

// Static Serving (Web App)
if (WEB_ROOT && fs.existsSync(WEB_ROOT)) {
  app.use(express.static(WEB_ROOT));
}

app.get(/.*/, (_req: Request, res: Response) => {
  if (_req.url.startsWith("/api")) {
    sendNotFoundError(res, "API endpoint");
    return;
  }

  if (WEB_ROOT && fs.existsSync(path.join(WEB_ROOT, "index.html"))) {
    res.sendFile(path.join(WEB_ROOT, "index.html"));
  } else {
    res.status(404).send("Web root not found");
  }
});

// Error handling middleware — ApiError`;

content = content.replace(new RegExp(routeMountStart + '[\\s\\S]+?' + routeMountEnd), newRouteMount);

// 3. Replace initializeEcosystem definition
const initEcoStart = 'const initializeEcosystem = async \\(\\) => \\{';
const initEcoEnd = '\\};\n\n// Start Server';

content = content.replace(new RegExp(initEcoStart + '[\\s\\S]+?' + initEcoEnd), '// Start Server');

// 4. Update the initializeEcosystem call
content = content.replace('await initializeEcosystem();', 'await initializeEcosystem(context);');

fs.writeFileSync(serverFile, content);
console.log('Decomposed server.ts');
