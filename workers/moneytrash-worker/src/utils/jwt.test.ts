import { describe, expect, it } from "vitest";
import { createJWT, verifyJWT } from "./jwt";

const secret = "moneytrash-test-secret-with-at-least-32-bytes";

describe("MoneyTrash office JWT", () => {
  it("round-trips a scoped office token", async () => {
    const token = await createJWT({
      officeId: "office-1",
      deskId: "desk-1",
      type: "moneytrash",
    }, secret);
    await expect(verifyJWT(token, secret)).resolves.toMatchObject({
      officeId: "office-1",
      deskId: "desk-1",
      type: "moneytrash",
      iss: "clickflash-moneytrash",
      aud: "moneytrash-api",
    });
  });

  it("rejects tampered signatures", async () => {
    const token = await createJWT({
      officeId: "office-1",
      deskId: "desk-1",
      type: "moneytrash",
    }, secret);
    await expect(verifyJWT(`${token.slice(0, -1)}x`, secret)).rejects.toThrow();
  });

  it("rejects undersized secrets", async () => {
    await expect(createJWT({
      officeId: "office-1",
      deskId: "desk-1",
      type: "moneytrash",
    }, "short")).rejects.toThrow(/at least 32 bytes/);
  });
});
