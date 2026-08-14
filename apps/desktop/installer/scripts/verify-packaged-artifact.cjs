const fs = require('node:fs/promises');
const path = require('node:path');

const FORBIDDEN_MARKERS = [
  'private.pem',
  '-----BEGIN PRIVATE KEY-----',
  '-----BEGIN RSA PRIVATE KEY-----',
  '-----BEGIN EC PRIVATE KEY-----',
  '-----BEGIN OPENSSH PRIVATE KEY-----',
  'test-gen-verify.ts',
  'test-nacl.mjs',
];

exports.default = async function verifyPackagedArtifact(context) {
  const asarPath = path.join(context.appOutDir, 'resources', 'app.asar');
  const artifact = await fs.readFile(asarPath);
  const trustPath = path.join(context.appOutDir, 'resources', 'license-public-key.txt');
  const publicKey = (await fs.readFile(trustPath, 'utf8')).trim();

  if (!/^[A-Za-z0-9+/]{43}=$/.test(publicKey)
      || Buffer.from(publicKey, 'base64').length !== 32) {
    throw new Error('Release blocked: packaged license public key is invalid.');
  }

  for (const marker of FORBIDDEN_MARKERS) {
    if (artifact.includes(Buffer.from(marker))) {
      throw new Error(
        `Release blocked: packaged app contains forbidden marker "${marker}".`,
      );
    }
  }
};
