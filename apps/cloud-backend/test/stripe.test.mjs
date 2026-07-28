import assert from 'node:assert/strict';
import test from 'node:test';
import stripeModule from '../src/stripe.ts';

const encoder = new TextEncoder();
const { verifyStripeSignature } = stripeModule;

async function signature(payload, secret, timestamp) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const value = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${payload}`))
  );
  const hex = Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `t=${timestamp},v1=${hex}`;
}

test('accepts a valid current Stripe signature', async () => {
  const payload = '{"type":"payment_intent.succeeded"}';
  const secret = 'whsec_test_secret';
  const now = 1_800_000_000;
  const header = await signature(payload, secret, now);

  assert.equal(await verifyStripeSignature(payload, header, secret, now), true);
});

test('rejects changed payloads, stale timestamps, and missing configuration', async () => {
  const payload = '{"type":"payment_intent.succeeded"}';
  const secret = 'whsec_test_secret';
  const now = 1_800_000_000;
  const header = await signature(payload, secret, now);

  assert.equal(await verifyStripeSignature(`${payload} `, header, secret, now), false);
  assert.equal(await verifyStripeSignature(payload, header, secret, now + 301), false);
  assert.equal(await verifyStripeSignature(payload, header, undefined, now), false);
});
