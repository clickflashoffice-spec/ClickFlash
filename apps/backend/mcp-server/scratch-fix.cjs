const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.ts'));

let totalReplaced = 0;

for (const file of files) {
  const filePath = path.join(srcDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace `catch (e: any) {` with `catch (e: unknown) {`
  content = content.replace(/catch \((e|err|error): any\)/g, 'catch ($1: unknown)');

  // Replace `e.message` with `($1 as Error).message` inside catches
  // Actually, replacing `e.message` globally where we replaced e: unknown is risky.
  // Instead, replace `(e: any)` to `(e: any /* fixed below */)`.
  
  // Let's just blindly cast to Error for message/stack in all catch bodies by doing regex on variable.
  // A simpler way: we'll replace `e.message` with `(e as Error).message`.
  // And `e.stack` with `(e as Error).stack`.
  content = content.replace(/\be\.message\b/g, '(e as Error).message');
  content = content.replace(/\berr\.message\b/g, '(err as Error).message');
  content = content.replace(/\berror\.message\b/g, '(error as Error).message');
  content = content.replace(/\be\.stack\b/g, '(e as Error).stack');

  // Fix other cases of `: any`
  content = content.replace(/args: any\b/g, 'args: Record<string, unknown>');
  content = content.replace(/let externalTools: any\[\]/g, 'let externalTools: Record<string, unknown>[]');
  content = content.replace(/let leads: any\[\]/g, 'let leads: Record<string, unknown>[]');
  content = content.replace(/let blockingGaps: any\[\]/g, 'let blockingGaps: Record<string, unknown>[]');
  content = content.replace(/\(g: any\)/g, '(g: Record<string, unknown>)');
  
  // mcp-env.d.ts fixes
  if (file === 'mcp-env.d.ts') {
    content = content.replace(/arguments\?: any\[\];/, 'arguments?: unknown[];');
    content = content.replace(/Schema: any;/g, 'Schema: unknown;');
  }

  // Write back
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Processed ${file}`);
}
console.log('Done');
