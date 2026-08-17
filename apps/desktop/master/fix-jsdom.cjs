const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && file !== 'node_modules' && file !== 'dist') {
      processDir(fullPath);
    } else if (fullPath.endsWith('.test.ts') || fullPath.endsWith('.test.tsx') || fullPath.endsWith('.spec.ts') || fullPath.endsWith('.spec.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes('@vitest-environment jsdom')) {
        content = `// @vitest-environment jsdom\n` + content;
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
