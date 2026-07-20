const crypto = require("node:crypto");
const { generateKeyPairSync } = crypto;
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const pub = publicKey.export({ type: "spki", format: "pem" });
const priv = privateKey.export({ type: "pkcs8", format: "pem" });
require("node:fs").writeFileSync("payload_private_key.pem", priv);
console.log(pub);
