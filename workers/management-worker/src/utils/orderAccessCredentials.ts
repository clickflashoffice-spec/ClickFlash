const PIN_MIN = 100_000;
const PIN_RANGE = 900_000;
const UINT32_RANGE = 0x1_0000_0000;
const UNBIASED_LIMIT = UINT32_RANGE - (UINT32_RANGE % PIN_RANGE);

export function generateOrderAccessPin(): string {
  const sample = new Uint32Array(1);
  let value: number;

  do {
    crypto.getRandomValues(sample);
    value = sample[0];
  } while (value >= UNBIASED_LIMIT);

  return String(PIN_MIN + (value % PIN_RANGE));
}

export function generateMagicLinkToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export function escapeEmailHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
