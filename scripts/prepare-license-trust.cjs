const fs = require('node:fs');
const path = require('node:path');

const outputArg = process.argv[2];
const publicKey = process.env.CLICKFLASH_LICENSE_PUBLIC_KEY?.trim();

if (!outputArg) {
  throw new Error('Usage: node prepare-license-trust.cjs <output-file>');
}
if (!publicKey || !/^[A-Za-z0-9+/]{43}=$/.test(publicKey)
  || Buffer.from(publicKey, 'base64').length !== 32) {
  throw new Error('CLICKFLASH_LICENSE_PUBLIC_KEY must be a 32-byte Ed25519 public key in base64');
}

const outputPath = path.resolve(process.cwd(), outputArg);
const outputDir = path.dirname(outputPath);
fs.mkdirSync(outputDir, { recursive: true });
const temporaryPath = `${outputPath}.${process.pid}.tmp`;
fs.writeFileSync(temporaryPath, `${publicKey}\n`, { encoding: 'utf8', mode: 0o644 });
fs.renameSync(temporaryPath, outputPath);
console.log(`[license-trust] Wrote approved public key to ${outputPath}`);
