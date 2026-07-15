import { verifyEd25519License } from '@clickflash/licensing';

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

/**
 * Validate a license key (offline, using Ed25519 from @clickflash/licensing)
 */
export async function validateLicenseKey(key: string, currentMachineId?: string): Promise<LicenseResult> {
  const result = verifyEd25519License(key, PUBLIC_KEY_B64, {
    expectedMachineId: currentMachineId
  });
  
  if (result.valid && result.data) {
    return {
      valid: true,
      data: {
        plan: result.data.plan as any,
        maxMasters: result.data.maxMasters,
        expiresAt: result.data.expiresAt,
        createdAt: result.data.createdAt,
        machineId: result.data.machineId,
        destinationId: result.data.destinationId
      }
    };
  }
  
  return {
    valid: false,
    error: result.error
  };
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
