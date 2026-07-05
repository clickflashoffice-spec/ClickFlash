const fs = require('fs');
const path = require('path');
const apiDir = path.join(process.cwd(), 'src/services/api');
const files = fs.readdirSync(apiDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const p = path.join(apiDir, file);
  let content = fs.readFileSync(p, 'utf8');
  if (content.includes('from "../../../types"')) {
    content = content.replace(/from "\.\.\/\.\.\/\.\.\/types"/g, 'from "../../types"');
    fs.writeFileSync(p, content);
    console.log('Re-fixed ' + file);
  }
}
