import assert from 'node:assert/strict';
import test from 'node:test';
import { Hono } from 'hono';
import authModule from '../src/auth.ts';

const {
  createGalleryToken,
  requireServiceAuth,
  verifyGalleryToken
} = authModule;

const strongSecret = 'a-secure-test-secret-that-is-at-least-32-bytes';

test('service middleware fails closed when the credential is not configured', async () => {
  const app = new Hono();
  app.get('/protected', requireServiceAuth, (context) => context.body(null, 204));

  const response = await app.request('/protected', {}, {});
  assert.equal(response.status, 503);
});

test('service middleware rejects an invalid credential and accepts the configured credential', async () => {
  const app = new Hono();
  app.get('/protected', requireServiceAuth, (context) => context.body(null, 204));

  const invalidResponse = await app.request(
    '/protected',
    { headers: { 'X-ClickFlash-Service-Key': 'incorrect-value' } },
    { SERVICE_API_KEY: strongSecret }
  );
  assert.equal(invalidResponse.status, 401);

  const validResponse = await app.request(
    '/protected',
    { headers: { 'X-ClickFlash-Service-Key': strongSecret } },
    { SERVICE_API_KEY: strongSecret }
  );
  assert.equal(validResponse.status, 204);
});

test('gallery token is scoped to its event and rejects a different signing secret', async () => {
  const token = await createGalleryToken({ JWT_SECRET: strongSecret }, 'event-123', 'MENA');
  const principal = await verifyGalleryToken({ JWT_SECRET: strongSecret }, token);
  const invalidPrincipal = await verifyGalleryToken(
    { JWT_SECRET: 'a-different-secure-secret-that-is-long-enough' },
    token
  );

  assert.deepEqual(principal, { kind: 'gallery', eventId: 'event-123', regionId: 'MENA' });
  assert.equal(invalidPrincipal, null);
});
