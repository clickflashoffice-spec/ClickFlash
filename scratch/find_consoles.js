const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.join(__dirname, '../../apps/master'),
  path.join(__dirname, '../../apps/touch'),
  path.join(__dirname, '../../apps/gallery')
];

function traverse(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === 'dist' || file === '.next' || file === 'build') continue;
    
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      traverse(fullPath, callback);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      callback(fullPath);
    }
  }
}

let changedFiles = 0;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  if (!content.includes('console.')) return;

  // We should only replace console.log in backend files if we have logger imported, or we can auto-import it.
  // Actually, replacing all console.log with logger.info on frontend might break if there's no frontend logger!
  // The plan specifically says: Migrate console.* logs to @/utils/logger
  // Let's print how many console.logs there are.
  
  const matches = content.match(/console\.(log|error|warn|info)/g);
  if (matches) {
    console.log(`Found ${matches.length} console usages in ${filePath}`);
  }
}

targetDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    traverse(dir, processFile);
  }
});
