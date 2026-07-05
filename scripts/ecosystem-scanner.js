import { logger } from '@/utils/logger';

const fs = require('fs');
const path = require('path');

const IGNORED_DIRS = ['node_modules', 'dist', 'build', '.git', '.claude'];
const TARGET_EXTS = ['.ts', '.tsx', '.js', '.jsx'];

const results = {
  totalFilesScanned: 0,
  godFiles: [],
  tsIgnores: [],
  hardcodedSecrets: []
};

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!IGNORED_DIRS.includes(file)) {
        scanDir(fullPath);
      }
    } else {
      const ext = path.extname(file);
      if (TARGET_EXTS.includes(ext)) {
        scanFile(fullPath);
      }
    }
  }
}

function scanFile(filePath) {
  results.totalFilesScanned++;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // God File Check
  if (lines.length > 500) {
    results.godFiles.push({ file: filePath, lines: lines.length });
  }

  // Tech Debt Check
  lines.forEach((line, index) => {
    if (line.includes('@ts-ignore')) {
      results.tsIgnores.push({ file: filePath, line: index + 1 });
    }
    // Very basic hardcoded secret heuristics
    if (line.match(/password\s*=\s*['"][^'"]+['"]/i) || line.match(/api[_-]?key\s*=\s*['"][^'"]+['"]/i)) {
      results.hardcodedSecrets.push({ file: filePath, line: index + 1 });
    }
  });
}

const rootDir = path.resolve(__dirname, '..');
scanDir(rootDir);

// Output results to JSON
const outputPath = path.join(rootDir, 'scan-results.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

logger.info(`Scan complete! Scanned ${results.totalFilesScanned} files.`);
logger.info(`Found ${results.godFiles.length} God Files (>500 lines).`);
logger.info(`Found ${results.tsIgnores.length} @ts-ignore overrides.`);
logger.info(`Found ${results.hardcodedSecrets.length} potential hardcoded secrets.`);
