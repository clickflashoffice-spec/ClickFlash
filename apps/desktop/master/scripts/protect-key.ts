import { DPAPI } from '../backend/utils/dpapi';

const key = process.argv[2];

if (!key) {
    console.error('Usage: tsx protect-key.ts <64-hex-character-key>');
    process.exit(1);
}

if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    console.error('FATAL: Key must be 64 hex characters (256-bit).');
    process.exit(1);
}

try {
    const encrypted = DPAPI.protect(key);
    console.log('\nSuccess! Add the following to your .env file:\n');
    console.log(`DB_ENCRYPTION_KEY="DPAPI:${encrypted}"\n`);
    console.log('The key is now securely encrypted with Windows DPAPI and tied to this machine/user account.');
} catch (err: any) {
    console.error('Failed to protect key:', err.message);
    process.exit(1);
}