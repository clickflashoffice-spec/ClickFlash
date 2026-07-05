const fs = require('fs');
const path = require('path');

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file === 'node_modules' || file === 'dist' || file === '.git' || file === '__tests__') continue;
            processDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            if (file === 'logger.ts' || file.includes('setupTests') || file.includes('vite') || file.includes('playwright')) continue;
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;
            
            if (content.match(/console\.(log|error|warn|info)/)) {
                content = content.replace(/console\.log/g, 'logger.info');
                content = content.replace(/console\.error/g, 'logger.error');
                content = content.replace(/console\.warn/g, 'logger.warn');
                content = content.replace(/console\.info/g, 'logger.info');
                
                if (!content.includes('@/utils/logger')) {
                    const importStmt = "import { logger } from '@/utils/logger';\n";
                    content = importStmt + content;
                }
                modified = true;
            }
            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log('Fixed', fullPath);
            }
        }
    }
}

processDir(path.join(process.cwd(), 'src'));
