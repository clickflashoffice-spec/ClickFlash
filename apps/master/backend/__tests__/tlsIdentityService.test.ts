import fs from 'fs';
import path from 'path';

// Set up env BEFORE import so it uses a temp directory
const TEMP_DIR = path.join(__dirname, 'temp_tls_test_' + Date.now());
process.env.APPDATA = TEMP_DIR;
process.env.HOME = TEMP_DIR;

import { getOrCreateManagedIdentity, rotateManagedIdentity } from '../config/tlsIdentityService';

describe('TLS Identity Service', () => {
  // Increase timeout for RSA key generation
  jest.setTimeout(15000);

  afterAll(() => {
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
  });

  it('should generate a new identity on first call', () => {
    const identity = getOrCreateManagedIdentity();
    expect(identity.key).toBeDefined();
    expect(identity.cert).toBeDefined();
    expect(identity.fingerprintSha256).toBeDefined();
  });

  it('should return the same identity from cache on second call', () => {
    const identity1 = getOrCreateManagedIdentity();
    const identity2 = getOrCreateManagedIdentity();
    expect(identity1.fingerprintSha256).toBe(identity2.fingerprintSha256);
  });

  it('should rotate identity when forced', () => {
    const identity1 = getOrCreateManagedIdentity();
    const identity2 = rotateManagedIdentity();
    
    expect(identity1.fingerprintSha256).not.toBe(identity2.fingerprintSha256);
    expect(identity2.key).not.toBe(identity1.key);
  });
});
