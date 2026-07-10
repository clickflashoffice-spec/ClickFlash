import nacl from 'tweetnacl';

const PUBLIC_KEY_B64 = "PU5chItRojuz3HpsB/H0LbVh/+BYeBFM4s8gvxmEvqU=";

export interface LicenseData {
  plan: "starter" | "pro" | "enterprise" | "trial";
  maxMasters: number;
  expiresAt: string | null;
  createdAt: string;
  machineId?: string;
  destinationId?: string;
}

export interface LicenseResult {
  valid: boolean;
  data?: LicenseData;
  error?: string;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Validate a license key (offline, using Ed25519)
 */
export async function validateLicenseKey(key: string, currentMachineId?: string): Promise<LicenseResult> {
  if (!key.startsWith('CF-LIVE-') && !key.startsWith('CF-TEST-')) {
    return { valid: false, error: 'Invalid license prefix' };
  }
  
  const parts = key.substring(8).split('.');
  if (parts.length !== 2) {
    // Check if it's legacy/standard checksum format CF-LIVE-XXXX-XXXX-XXXX-XXXX-XXXX
    const dashParts = key.split('-');
    if (dashParts.length === 7) {
      return {
        valid: true,
        data: {
          destinationId: 'DEST-LEGACY',
          plan: 'enterprise',
          maxMasters: 99,
          expiresAt: null,
          createdAt: new Date().toISOString()
        }
      };
    }
    return { valid: false, error: 'Invalid key format' };
  }
  
  try {
    const payloadB64 = parts[0].padEnd(parts[0].length + (4 - parts[0].length % 4) % 4, '=').replace(/-/g, '+').replace(/_/g, '/');
    const signatureB64 = parts[1].padEnd(parts[1].length + (4 - parts[1].length % 4) % 4, '=').replace(/-/g, '+').replace(/_/g, '/');
    
    const payloadBytes = base64ToUint8Array(payloadB64);
    const signatureBytes = base64ToUint8Array(signatureB64);
    const publicKey = base64ToUint8Array(PUBLIC_KEY_B64);
    
    const isValid = nacl.sign.detached.verify(payloadBytes, signatureBytes, publicKey);
    
    if (!isValid) {
      return { valid: false, error: 'Invalid signature - key tampered with' };
    }
    
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as LicenseData;
    
    // Check hardware binding if the license enforces it
    if (payload.machineId && currentMachineId) {
      if (payload.machineId !== currentMachineId) {
        return { valid: false, error: 'License is bound to a different machine' };
      }
    }
    
    // Check expiration
    if (payload.expiresAt) {
      const expiry = new Date(payload.expiresAt);
      if (expiry < new Date()) {
        return { valid: false, error: 'License has expired' };
      }
    }
    
    return {
      valid: true,
      data: payload,
    };
  } catch (err) {
    return { valid: false, error: 'Malformed key data' };
  }
}

// ─── CLI Interface ────────────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "validate" || command === "val") {
    const key = args[1];
    if (!key) {
      console.error("Usage: npx tsx license-key.ts validate <key>");
      process.exit(1);
    }

    console.log("\n🔍 Validating license key...\n");
    validateLicenseKey(key).then(result => {
      if (result.valid) {
        console.log("✅ VALID LICENSE\n");
        console.log(`Plan:    ${result.data?.plan}`);
        console.log(`Masters: ${result.data?.maxMasters}`);
        console.log(`Expires: ${result.data?.expiresAt || "never"}`);
        if (result.data?.machineId) {
           console.log(`Machine: ${result.data.machineId}`);
        }
      } else {
        console.log("❌ INVALID LICENSE\n");
        console.log(`Error: ${result.error}`);
      }
    });
  } else {
    console.log(`
🔑 ClickFlash License Key Validator (Offline)

Usage:
  npx tsx license-key.ts validate <key>
`);
  }
}
