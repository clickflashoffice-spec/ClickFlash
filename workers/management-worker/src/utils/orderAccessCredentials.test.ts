import { escapeEmailHtml, generateMagicLinkToken, generateOrderAccessPin } from "./orderAccessCredentials.js";

describe("orderAccessCredentials", () => {
  it("generates six-digit numeric access PINs", () => {
    for (let index = 0; index < 100; index += 1) {
      expect(generateOrderAccessPin()).toMatch(/^\d{6}$/);
    }
  });

  it("generates 256-bit hexadecimal magic-link tokens", () => {
    const first = generateMagicLinkToken();
    const second = generateMagicLinkToken();

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).not.toBe(first);
  });

  it("escapes customer-controlled HTML in access emails", () => {
    expect(escapeEmailHtml('<img src=x onerror="alert(1)">')).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    );
  });
});
