import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

async function generatePayloadKey() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  
  const privateKeyPem = privateKey.export({
    type: "pkcs8",
    format: "pem",
  });
  
  // Extract raw 32-byte public key from SPKI format
  const publicKeyDer = publicKey.export({ type: "spki", format: "der" });
  // Ed25519 SPKI DER prefix is 12 bytes long: 302a300506032b6570032100
  const rawPublicKey = publicKeyDer.slice(12);
  const publicKeyBase64 = rawPublicKey.toString("base64");
  
  // keyId could be a hash of the public key or a descriptive name
  const keyId = "payload-key-v1-" + Date.now();
  
  const outputDir = process.cwd();
  const keyPath = path.join(outputDir, "payload-private-key.pem");
  
  fs.writeFileSync(keyPath, privateKeyPem);
  
  console.log(JSON.stringify({
    keyId,
    publicKeyBase64,
    keyPath
  }, null, 2));
}

generatePayloadKey().catch(console.error);
