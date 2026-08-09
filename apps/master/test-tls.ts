import { getOrCreateManagedIdentity } from './backend/config/tlsIdentityService.ts';

console.log('Testing getOrCreateManagedIdentity...');
const identity1 = getOrCreateManagedIdentity();
console.log('Successfully generated identity 1!');
console.log('Fingerprint:', identity1.fingerprintSha256);
console.log('Has Cert:', identity1.cert.includes('BEGIN CERTIFICATE'));
console.log('Has Key:', identity1.key.includes('PRIVATE KEY'));

const identity2 = getOrCreateManagedIdentity();
console.log('Identity 2 matches Identity 1 (cached):', identity1.fingerprintSha256 === identity2.fingerprintSha256);

console.log('Test completed successfully.');
process.exit(0);
