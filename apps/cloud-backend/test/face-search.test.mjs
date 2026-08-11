import assert from 'node:assert/strict';
import test from 'node:test';
import { Hono } from 'hono';
import authModule from '../src/auth.ts';
import galleryModule from '../src/routes/gallery.ts';

const { createGalleryToken } = authModule;
const galleryRoutes = galleryModule.default ?? galleryModule;
const strongSecret = 'a-secure-test-secret-that-is-at-least-32-bytes';

function createTestApp(database) {
  const app = new Hono();
  app.use('*', async (context, next) => {
    context.set('regionId', 'MENA');
    context.set('DB', database);
    await next();
  });
  app.route('/api', galleryRoutes);
  return app;
}

function databaseThatMustNotBeRead() {
  return {
    prepare() {
      throw new Error('Face-search fallback must not read unscored photos from D1');
    }
  };
}

test('face search requires a gallery token before processing a vector', async () => {
  const app = createTestApp(databaseThatMustNotBeRead());
  const response = await app.request('/api/ai/face-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vector: [1, ...new Array(127).fill(0)] })
  }, { JWT_SECRET: strongSecret });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Unauthorized' });
});

test('face search rejects malformed and migration-gated vectors', async () => {
  const app = createTestApp(databaseThatMustNotBeRead());
  const token = await createGalleryToken({ JWT_SECRET: strongSecret }, 'event-123', 'MENA');
  const response = await app.request('/api/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ vector: new Array(512).fill(0.1) })
  }, { JWT_SECRET: strongSecret });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, 'INVALID_FACE_VECTOR');
});

test('valid legacy search fails closed without querying or returning photos', async () => {
  const app = createTestApp(databaseThatMustNotBeRead());
  const token = await createGalleryToken({ JWT_SECRET: strongSecret }, 'event-123', 'MENA');
  const response = await app.request('/api/ai/face-search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ vector: [1, ...new Array(127).fill(0)] })
  }, { JWT_SECRET: strongSecret });

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: 'Face search is unavailable until the event-scoped vector index is configured',
    code: 'FACE_SEARCH_UNAVAILABLE',
    expectedDimensions: 128,
    matches: []
  });
});
