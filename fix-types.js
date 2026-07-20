const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, 'apps/master/backend');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        walk(path.join(dir, file), fileList);
      }
    } else if (file.endsWith('.ts')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const files = walk(BACKEND_DIR);

let modifiedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Replace patterns
  content = content.replace(/\(req\.session as any\)\?/g, 'req.session?');
  content = content.replace(/\(req\.session as any\)\./g, 'req.session.');
  content = content.replace(/\(req as any\)\.user/g, 'req.user');
  content = content.replace(/\(req as any\)\.session/g, 'req.session');
  content = content.replace(/\(req as any\)\.dbManager/g, 'req.dbManager');
  content = content.replace(/\(req as any\)\.file/g, 'req.file');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
    console.log(`Modified ${file}`);
  }
}

console.log(`Successfully updated ${modifiedCount} files.`);
