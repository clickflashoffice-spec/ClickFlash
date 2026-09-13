import test from "node:test";
import assert from "node:assert/strict";
import { checkFileContentForAirgapViolations, scanRepositoryAirgap } from "./check-biometric-airgap.mjs";

test("checkFileContentForAirgapViolations detects explicit disablement of biometric air-gap", () => {
  const badContent = `
    async function syncToKiosks() {
      await transferService.sendAlbumToKiosks(albumId, { excludeBiometrics: false });
    }
  `;

  const violations = checkFileContentForAirgapViolations("apps/desktop/master/service.ts", badContent);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, "BIOMETRIC-002");
});

test("checkFileContentForAirgapViolations passes for compliant air-gapped code", () => {
  const goodContent = `
    async function syncToKiosks() {
      await transferService.sendAlbumToKiosks(albumId, { excludeBiometrics: true });
    }
  `;

  const violations = checkFileContentForAirgapViolations("apps/desktop/master/service.ts", goodContent);
  assert.equal(violations.length, 0);
});

test("scanRepositoryAirgap passes cleanly on current repository codebase", () => {
  const violations = scanRepositoryAirgap();
  assert.equal(violations.length, 0, `Expected 0 violations but found: ${JSON.stringify(violations)}`);
});
