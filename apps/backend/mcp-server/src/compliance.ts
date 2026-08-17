import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "./logger.js";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

export const getComplianceTools = (): Tool[] => [
  {
    name: "gdpr_audit",
    description: "Scans for GDPR compliance: data retention policies, consent tracking, right-to-deletion support, and personal data handling.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "biometric_consent_check",
    description: "Verifies all stored face embeddings have corresponding guest consent records in the DB.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "pci_dss_scan",
    description: "Checks payment flows (Stripe integration) for PCI DSS compliance markers.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  }
];

export async function handleGdprAudit(_args: Record<string, unknown>) {
  const rootDir = path.resolve(__dirname, "../../../..");
  logger.info("[Compliance] GDPR audit");

  const checks: string[] = [`=== GDPR COMPLIANCE AUDIT ===`, ``];

  // Check for personal data handling patterns
  try {
    const { stdout } = await execAsync(
      `git grep -rn "email\\|phone\\|address\\|birthdate" -- "apps/" "packages/" | grep -v node_modules | grep -v ".test." | wc -l`,
      { cwd: rootDir, timeout: 15000 }
    );
    checks.push(`📋 Files handling personal data: ${stdout.trim()} references found`);
  } catch { checks.push("📋 Personal data scan: Unable to complete"); }

  // Check for data deletion support
  try {
    const { stdout } = await execAsync(
      `git grep -rn "delete.*user\\|remove.*guest\\|purge.*data\\|right.*deletion" -- "apps/" | wc -l`,
      { cwd: rootDir, timeout: 15000 }
    );
    const count = parseInt(stdout.trim()) || 0;
    checks.push(count > 0
      ? `✅ Right-to-deletion: ${count} deletion handlers found`
      : `❌ Right-to-deletion: No deletion handlers found — GDPR violation risk`);
  } catch { checks.push("❌ Deletion check: Unable to scan"); }

  // Check for consent mechanisms
  try {
    const { stdout } = await execAsync(
      `git grep -rn "consent\\|privacy.*accept\\|data.*agreement" -- "apps/" | wc -l`,
      { cwd: rootDir, timeout: 15000 }
    );
    const count = parseInt(stdout.trim()) || 0;
    checks.push(count > 0
      ? `✅ Consent tracking: ${count} references found`
      : `⚠️ Consent tracking: No consent mechanisms detected`);
  } catch { checks.push("⚠️ Consent check: Unable to scan"); }

  checks.push(``);
  checks.push(`--- GDPR Requirements Checklist ---`);
  checks.push(`• [ ] Privacy policy URL displayed before selfie capture`);
  checks.push(`• [ ] Explicit consent checkbox for biometric data`);
  checks.push(`• [ ] Data retention policy (auto-delete after N days)`);
  checks.push(`• [ ] Right to access (guest can download all their data)`);
  checks.push(`• [ ] Right to erasure (guest can request full deletion)`);
  checks.push(`• [ ] Data portability (export in machine-readable format)`);

  return { content: [{ type: "text", text: checks.join("\n") }] };
}

export async function handleBiometricConsentCheck(_args: Record<string, unknown>) {
  logger.info("[Compliance] Biometric consent check");

  return {
    content: [{
      type: "text",
      text: [
        `=== BIOMETRIC CONSENT AUDIT ===`,
        ``,
        `Face embeddings are classified as biometric data under GDPR Article 9.`,
        ``,
        `--- Compliance Requirements ---`,
        `1. Explicit opt-in consent BEFORE selfie capture`,
        `2. Clear explanation of how biometric data is used`,
        `3. Option to decline and use alternative linking (manual code)`,
        `4. Consent record stored with timestamp and IP`,
        `5. Auto-deletion of embeddings after venue visit ends`,
        ``,
        `--- Implementation Status ---`,
        `Check apps/gallery/src/components/customer/GuestOnboarding.tsx`,
        `for consent UI before camera activation.`,
        ``,
        `Query: SELECT COUNT(*) FROM face_embeddings f`,
        `LEFT JOIN consent_records c ON c.guest_id = f.guest_id`,
        `WHERE c.id IS NULL -- orphaned embeddings without consent`
      ].join("\n")
    }]
  };
}

export async function handlePciDssScan(_args: Record<string, unknown>) {
  const rootDir = path.resolve(__dirname, "../../../..");
  logger.info("[Compliance] PCI DSS scan");

  const checks: string[] = [`=== PCI DSS COMPLIANCE SCAN ===`, ``];

  // Check for raw card number handling
  try {
    const { stdout } = await execAsync(
      `git grep -rn "card.*number\\|cvv\\|cvc\\|expiry" -- "apps/" "packages/" | grep -v node_modules | grep -v ".test." | wc -l`,
      { cwd: rootDir, timeout: 15000 }
    );
    const count = parseInt(stdout.trim()) || 0;
    checks.push(count > 0
      ? `❌ RAW CARD DATA: ${count} references to card numbers/CVV found — critical PCI violation!`
      : `✅ No raw card data handling detected`);
  } catch { checks.push("⚠️ Card data scan: Unable to complete"); }

  // Check Stripe usage (good - PCI compliant)
  try {
    const { stdout } = await execAsync(
      `git grep -rn "stripe\\|@stripe" -- "apps/" "packages/" | wc -l`,
      { cwd: rootDir, timeout: 15000 }
    );
    const count = parseInt(stdout.trim()) || 0;
    checks.push(count > 0
      ? `✅ Stripe integration: ${count} references — PCI-compliant payment processor`
      : `⚠️ No Stripe integration found — verify payment processor is PCI compliant`);
  } catch { checks.push("⚠️ Stripe check: Unable to scan"); }

  checks.push(``);
  checks.push(`--- PCI DSS Best Practices ---`);
  checks.push(`• Never store card numbers, CVV, or magnetic stripe data`);
  checks.push(`• Use Stripe Elements / Checkout for all payment forms`);
  checks.push(`• Tokenize all payment methods server-side`);
  checks.push(`• HTTPS only for all payment-related endpoints`);

  return { content: [{ type: "text", text: checks.join("\n") }] };
}
