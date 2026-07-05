const fs = require('fs');

const file = 'apps/master/backend/server.ts';
let c = fs.readFileSync(file, 'utf8');

// Find the start of the ecosystem block
const ecoStart = c.indexOf('// --- Unified Ecosystem Initialization');
if (ecoStart !== -1) {
    // Find the end of it, which is right before `// Start Server`
    const nextSection = c.indexOf('// Start Server', ecoStart + 1);
    if (nextSection !== -1) {
        c = c.slice(0, ecoStart) + c.slice(nextSection);
    }
}

// Ensure initializeEcosystem(context) is called correctly without breaking the promise
c = c.replace('await initializeEcosystem();', 'await initializeEcosystem(context);');

fs.writeFileSync(file, c);
