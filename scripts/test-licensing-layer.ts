import { generateEd25519License, verifyEd25519License } from '../packages/licensing/src/ed25519';

const PRIVATE_KEY_B64 = "EQdSP71FUDU55wNFrjIfVQUpYBme6kBsYhD1ecjmvAg9TlyEi1GiO7PcemwH8fQttWH/4Fh4EUzizyC/GYS+pQ==";
const PUBLIC_KEY_B64 = "PU5chItRojuz3HpsB/H0LbVh/+BYeBFM4s8gvxmEvqU=";

async function run() {
  console.log('Testing License Generator...');
  try {
    const license = generateEd25519License({
      plan: 'pro',
      maxMasters: 5,
      expiresDays: 365,
      machineId: '1234-5678'
    }, PRIVATE_KEY_B64);
    
    console.log('Generated Key:', license.key);

    const validation = verifyEd25519License(license.key, PUBLIC_KEY_B64, { expectedMachineId: '1234-5678' });
    
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
