const path = require('node:path');
const asar = require('@electron/asar');

const PRIVATE_KEY_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\s+[A-Za-z0-9+/=\r\n]{40,}-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /CLICKFLASH_LICENSE_PRIVATE_KEY\s*=\s*["']?[A-Za-z0-9+/=]{40,}/,
  /[A-Za-z0-9+/]{86}==/,
];

const RENDERER_FORBIDDEN_PATTERNS = [
  /generateEd25519License/,
  /verifyEd25519License/,
  /[A-Za-z0-9+/]{86}==/,
];

exports.default = async function verifyPackagedArtifact(context) {
  const archivePath = path.join(context.appOutDir, 'resources', 'app.asar');
  const entries = asar.listPackage(archivePath);
  for (const required of ['\\dist\\main.js', '\\dist\\preload.js']) {
    if (!entries.includes(required)) {
      throw new Error(`Release blocked: packaged app is missing ${required}.`);
    }
  }

  const forbiddenDependencyEntry = entries.find((entry) => (
    entry.startsWith('\\node_modules\\@clickflash\\licensing')
    || /\.(?:pem|key)$/i.test(entry)
    || /(?:test-gen-verify\.ts|test-nacl\.mjs)$/i.test(entry)
  ));
  if (forbiddenDependencyEntry) {
    throw new Error(
      `Release blocked: packaged app contains source/private-material entry ${forbiddenDependencyEntry}.`,
    );
  }

  const rendererEntries = entries.filter((entry) => (
    entry.startsWith('\\dist\\renderer\\') && /\.(?:js|html)$/i.test(entry)
  ));
  if (rendererEntries.length === 0) {
    throw new Error('Release blocked: packaged renderer files are missing.');
  }
  const textEntries = entries.filter((entry) => /\.(?:js|json|html|txt)$/i.test(entry));
  for (const entry of textEntries) {
    const contents = asar.extractFile(archivePath, entry.replace(/^[/\\]/, '')).toString('utf8');
    const privateKeyMatch = PRIVATE_KEY_PATTERNS.find((pattern) => pattern.test(contents));
    if (privateKeyMatch) {
      throw new Error(`Release blocked: private key material found in ${entry}.`);
    }
    const rendererMatch = entry.startsWith('\\dist\\renderer\\')
      ? RENDERER_FORBIDDEN_PATTERNS.find((pattern) => pattern.test(contents))
      : null;
    if (rendererMatch) {
      throw new Error(`Release blocked: renderer signing-key boundary failed in ${entry}.`);
    }
  }
};
