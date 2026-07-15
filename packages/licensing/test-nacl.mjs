import nacl from 'tweetnacl';

function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const privateKeyB64 = "EQdSP71FUDU55wNFrjIfVQUpYBme6kBsYhD1ecjmvAg9TlyEi1GiO7PcemwH8fQttWH/4Fh4EUzizyC/GYS+pQ==";
const publicKeyB64 = "PU5chItRojuz3HpsB/H0LbVh/+BYeBFM4s8gvxmEvqU=";

function generate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 365);
  
  const privateKey = base64ToUint8Array(privateKeyB64);

  const payload = {
    plan: 'pro',
    maxMasters: 5,
    expiresAt: expiresAt.toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };
  
  const payloadStr = JSON.stringify({ ...payload, nonce: Math.random().toString(36).substring(2, 10) });
  const payloadBytes = new TextEncoder().encode(payloadStr);
  
  const signatureBytes = nacl.sign.detached(payloadBytes, privateKey);
  
  const payloadB64 = uint8ArrayToBase64(payloadBytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const signatureB64 = uint8ArrayToBase64(signatureBytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
  return `CF-LIVE-${payloadB64}.${signatureB64}`;
}

function verify(key) {
  const parts = key.substring(8).split('.');
  const payloadB64 = parts[0].padEnd(parts[0].length + (4 - parts[0].length % 4) % 4, '=').replace(/-/g, '+').replace(/_/g, '/');
  const signatureB64 = parts[1].padEnd(parts[1].length + (4 - parts[1].length % 4) % 4, '=').replace(/-/g, '+').replace(/_/g, '/');
  
  const payloadBytes = base64ToUint8Array(payloadB64);
  const signatureBytes = base64ToUint8Array(signatureB64);
  const publicKey = base64ToUint8Array(publicKeyB64);
  
  const isValid = nacl.sign.detached.verify(payloadBytes, signatureBytes, publicKey);
  return isValid;
}

try {
  const key = generate();
  console.log("Generated Key:", key);
  console.log("Verify Result:", verify(key));
} catch (e) {
  console.error("Error:", e);
}
