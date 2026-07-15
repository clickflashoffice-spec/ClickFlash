import { generateKeyPair, signLicense } from './crypto';
import { getMachineFingerprint } from './hardware';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  console.log('Generating RSA-4096 Key Pair... (This may take a moment)');
  const { publicKey, privateKey } = generateKeyPair();

  console.log('Fetching local hardware fingerprint...');
  const fingerprint = await getMachineFingerprint();
  console.log(`Machine Fingerprint: ${fingerprint}`);

  const payload = {
    machineFingerprint: fingerprint,
    issuedAt: Date.now(),
    features: ['master', 'pro', 'offline-editor']
  };

  const signedLicense = signLicense(payload, privateKey);

  const outDir = path.join(process.cwd(), 'out');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const licensePath = path.join(outDir, 'license.json');
  fs.writeFileSync(licensePath, JSON.stringify(signedLicense, null, 2));

  const pubKeyPath = path.join(outDir, 'public.pem');
  fs.writeFileSync(pubKeyPath, publicKey);

  const privKeyPath = path.join(outDir, 'private.pem');
  fs.writeFileSync(privKeyPath, privateKey);

  console.log(`\nLicense generated successfully!`);
  console.log(`- License: ${licensePath}`);
  console.log(`- Public Key: ${pubKeyPath}`);
  console.log(`- Private Key: ${privKeyPath}`);
  console.log(`\nIMPORTANT: Keep private.pem secure! Do not distribute it.`);
}

main().catch(err => {
  console.error('Failed to generate license:', err);
  process.exit(1);
});
