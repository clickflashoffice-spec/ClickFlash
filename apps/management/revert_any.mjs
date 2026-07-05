import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Revert unknown back to any to fix the build
  content = content.replace(/:\s*unknown\b/g, ': any');
  content = content.replace(/<unknown>/g, '<any>');
  content = content.replace(/<unknown,/g, '<any,');
  content = content.replace(/, unknown>/g, ', any>');
  content = content.replace(/as unknown\b/g, 'as any');

  // Also fix unused vars by replacing them or ignoring them? No, let's just let the normal unused var rule apply, maybe it was a warning before or the type change triggered it.

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Reverted unknown to any in ${filePath}`);
  }
}

walkDir(path.join(process.cwd(), 'src'), processFile);
console.log('Done reverting unknown to any.');
