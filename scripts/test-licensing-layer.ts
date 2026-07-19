import { generateEd25519KeyPair, generateEd25519License, verifyEd25519License } from '../packages/licensing/src/ed25519';

async function run() {
  console.log('Testing License Generator...');
  try {
    const testKeys = generateEd25519KeyPair();
    const license = generateEd25519License({
      plan: 'pro',
      maxMasters: 5,
      expiresDays: 365,
      machineId: '1234-5678'
    }, testKeys.privateKey);

    const validation = verifyEd25519License(license.key, testKeys.publicKey, { expectedMachineId: '1234-5678' });
    
    console.log('Validation Result:', validation);
    
    if (validation.valid) {
      console.log('✅ License Generator & Verification is WORKING correctly.');
    } else {
      console.log('❌ Validation FAILED:', validation.error);
    }
  } catch (e) {
    console.error('Error during execution:', e);
  }
}

run();
