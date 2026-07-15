import { generateEd25519License, verifyEd25519License } from './src/ed25519';

const PRIVATE_KEY_B64 = "EQdSP71FUDU55wNFrjIfVQUpYBme6kBsYhD1ecjmvAg9TlyEi1GiO7PcemwH8fQttWH/4Fh4EUzizyC/GYS+pQ==";
const PUBLIC_KEY_B64 = "PU5chItRojuz3HpsB/H0LbVh/+BYeBFM4s8gvxmEvqU=";

const license = generateEd25519License({
  plan: 'pro',
  maxMasters: 5,
  expiresDays: 365,
  machineId: undefined
}, PRIVATE_KEY_B64);

console.log("Generated Key:", license.key);

const result = verifyEd25519License(license.key, PUBLIC_KEY_B64, { expectedMachineId: '1234' });
console.log("Verify result with different machine ID:", result);

const resultNoMachine = verifyEd25519License(license.key, PUBLIC_KEY_B64);
console.log("Verify result without machine ID:", resultNoMachine);
