const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
const textEncoder = new TextEncoder();

function constantTimeHexMatch(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function toHex(value: ArrayBuffer): string {
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifyStripeSignature(
  payload: string,
  signatureHeader: string | undefined,
  webhookSecret: string | undefined,
  nowSeconds = Math.floor(Date.now() / 1000)
): Promise<boolean> {
  if (!signatureHeader || !webhookSecret) return false;

  const fields = signatureHeader.split(',').map((field) => field.trim().split('=', 2));
  const timestampValue = fields.find(([name]) => name === 't')?.[1];
  const signatures = fields.filter(([name, value]) => name === 'v1' && value).map(([, value]) => value);
  const timestamp = Number(timestampValue);

  if (
    !Number.isSafeInteger(timestamp) ||
    signatures.length === 0 ||
    Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS
  ) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const expected = toHex(
    await crypto.subtle.sign('HMAC', key, textEncoder.encode(`${timestamp}.${payload}`))
  );

  return signatures.some((signature) => constantTimeHexMatch(signature, expected));
}

