const fs = require('fs');
const path = require('path');
const walkSync = function(dir, filelist) {
  let files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(dir + '/' + file).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        filelist = walkSync(dir + '/' + file, filelist);
      }
    }
    else {
      if (file.endsWith('.ts') || file.endsWith('.js')) {
        filelist.push(dir + '/' + file);
      }
    }
  });
  return filelist;
};
const files = [...walkSync('apps/master/backend'), ...walkSync('apps/touch/backend')];
let fixed = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('__dirname') && !content.includes('fileURLToPath')) {
    const polyfill = "\nimport { fileURLToPath } from 'url';\nimport { dirname } from 'path';\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = dirname(__filename);\n";
    const importRegex = /^import\s+.*?;?\s*$/gm;
    let match;
    let lastImportIndex = -1;
    while ((match = importRegex.exec(content)) !== null) {
      lastImportIndex = match.index + match[0].length;
    }
    if (lastImportIndex !== -1) {
      content = content.slice(0, lastImportIndex) + polyfill + content.slice(lastImportIndex);
    } else {
      content = polyfill + content;
    }
    fs.writeFileSync(file, content);
    fixed++;
  }
}
console.log('Fixed files:', fixed);
