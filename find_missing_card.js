const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

async function scanDir(dir) {
    const files = await readdir(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stats = await stat(fullPath);
        if (stats.isDirectory()) {
            await scanDir(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
            const content = await readFile(fullPath, 'utf8');
            if (content.includes('<Card') && !content.includes('import Card')) {
                console.log(`Missing Card import in: ${fullPath}`);
            }
        }
    }
}

scanDir('e:/ClickFlash/apps/management/src');
