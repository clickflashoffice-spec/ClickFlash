import { aesEncryptAsync, AESEncryptionKey } from 'expo-crypto';
async function test() { const k = await AESEncryptionKey.generate(); const s = await aesEncryptAsync('a', k); const c = s.ciphertext; }
