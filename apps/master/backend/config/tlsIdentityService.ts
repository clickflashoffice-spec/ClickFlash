import fs from 'fs';
import path from 'path';
import forge from 'node-forge';
import crypto from 'crypto';
import { logger } from '../utils/logger';

// Store certificates in the OS-specific app data directory to persist across app updates
const getTlsDataDir = () => {
  const isWindows = process.platform === 'win32';
  const appData = isWindows 
    ? process.env.APPDATA 
    : (process.platform === 'darwin' ? path.join(process.env.HOME || '', 'Library', 'Application Support') : path.join(process.env.HOME || '', '.config'));
  
  if (!appData) {
    // Fallback to local node_modules-adjacent hidden dir if we can't find app data
    return path.join(process.cwd(), '.clickflash-tls');
  }
  return path.join(appData, 'ClickFlash', 'tls');
};

const TLS_DIR = getTlsDataDir();
const CERT_PATH = path.join(TLS_DIR, 'master-identity.crt');
const KEY_PATH = path.join(TLS_DIR, 'master-identity.key');

export interface ManagedIdentity {
  key: string;
  cert: string;
  fingerprintSha256: string;
}

// Memory cache so we don't read/generate multiple times
let cachedIdentity: ManagedIdentity | null = null;

/**
 * Initializes or retrieves the self-signed TLS identity for the Master Node.
 * This ensures the Master always has a certificate for HTTPS, even if the user hasn't configured one.
 */
export function getOrCreateManagedIdentity(): ManagedIdentity {
  if (cachedIdentity) return cachedIdentity;

  // 1. Try to load existing
  if (fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH)) {
    try {
      const cert = fs.readFileSync(CERT_PATH, 'utf8');
      const key = fs.readFileSync(KEY_PATH, 'utf8');
      
      // Calculate SHA-256 fingerprint for QR pinning
      const forgeCert = forge.pki.certificateFromPem(cert);
      
      // Check expiration: rotate if expired or expiring within 30 days
      const now = new Date();
      const expires = forgeCert.validity.notAfter;
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      if (expires.getTime() - now.getTime() < thirtyDaysMs) {
        logger.info(`[TLS Identity] Certificate expired or expiring soon (${expires}). Rotating...`);
        return rotateManagedIdentity();
      }

      const der = forge.asn1.toDer(forge.pki.certificateToAsn1(forgeCert)).getBytes();
      const fingerprintSha256 = crypto.createHash('sha256').update(Buffer.from(der, 'binary')).digest('hex');
      
      logger.info(`[TLS Identity] Loaded existing managed identity from ${TLS_DIR}`);
      cachedIdentity = { key, cert, fingerprintSha256 };
      return cachedIdentity;
    } catch (err) {
      logger.warn(`[TLS Identity] Failed to load existing identity, generating a new one. Error: ${err}`);
      // Proceed to generate new
    }
  }

  return rotateManagedIdentity();
}

/**
 * Forcibly rotates the managed TLS identity by generating a new keypair and self-signed certificate.
 */
export function rotateManagedIdentity(): ManagedIdentity {
  logger.info('[TLS Identity] Generating new managed TLS identity (this may take a moment)...');
  
  if (!fs.existsSync(TLS_DIR)) {
    fs.mkdirSync(TLS_DIR, { recursive: true });
  }

  // Generate a keypair
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  
  cert.publicKey = keys.publicKey;
  // Make it valid for 10 years
  cert.validity.notBefore = new Date();
  const notAfter = new Date();
  notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);
  cert.validity.notAfter = notAfter;

  const attrs = [
    { name: 'commonName', value: 'ClickFlash Master' },
    { name: 'countryName', value: 'US' },
    { shortName: 'ST', value: 'Photography' },
    { name: 'localityName', value: 'Studio' },
    { name: 'organizationName', value: 'ClickFlash' },
    { shortName: 'OU', value: 'LAN Identity' }
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  // Set extensions for a leaf certificate that can be used for server auth
  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: true // Self-signed
    },
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    },
    {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true,
      codeSigning: true,
      emailProtection: true,
      timeStamping: true
    },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' }, // DNS
        { type: 7, ip: '127.0.0.1' }     // IP
      ]
    }
  ]);

  // Self-sign the certificate
  cert.sign(keys.privateKey, forge.md.sha256.create());

  // PEM-format keys and cert
  const pemCert = forge.pki.certificateToPem(cert);
  const pemKey = forge.pki.privateKeyToPem(keys.privateKey);

  // Save to disk
  fs.writeFileSync(CERT_PATH, pemCert, { mode: 0o600 });
  fs.writeFileSync(KEY_PATH, pemKey, { mode: 0o600 });

  // Compute fingerprint
  const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const fingerprintSha256 = crypto.createHash('sha256').update(Buffer.from(der, 'binary')).digest('hex');

  logger.info(`[TLS Identity] Generated and saved new identity to ${TLS_DIR}`);

  cachedIdentity = { key: pemKey, cert: pemCert, fingerprintSha256 };
  return cachedIdentity;
}
