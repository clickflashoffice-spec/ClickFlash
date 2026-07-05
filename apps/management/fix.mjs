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

  // Replace `: any` with `: unknown` or remove where possible
  // To be safer, we can just replace basic `any` usages
  content = content.replace(/:\s*any\b/g, ': unknown');
  content = content.replace(/<any>/g, '<unknown>');
  content = content.replace(/<any,/g, '<unknown,');
  content = content.replace(/, any>/g, ', unknown>');

  // We should not modify window as any etc if we can't type check, but let's just do unknown.
  // Wait, (window as unknown) is safe but (window as any).Sentry is needed if Sentry is not on window type.
  // So let's revert `as unknown` if it breaks things.
  // Better yet, just use `any` to `unknown` and if ts complains, we can fix it.
  
  // React.memo optimizations
  // We can look for `export const Component = ({` and if it doesn't have React.memo, wrap it? Too risky.

  // Performance: replace Object.keys().map with more direct access if possible, or leave it.

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Modified ${filePath}`);
  }
}

walkDir(path.join(process.cwd(), 'src'), processFile);
console.log('Done scanning for any types.');
