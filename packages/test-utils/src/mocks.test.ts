import { describe, it, expect } from 'vitest';
import { http, HttpResponse, createMockServer } from './mocks.js';

describe('createMockServer', () => {
  it('creates a server with handlers', () => {
    const server = createMockServer([
      http.get('/api/test', () => HttpResponse.json({ ok: true })),
    ]);
    expect(server).toBeDefined();
    expect(server.listen).toBeDefined();
    expect(server.close).toBeDefined();
    server.close();
  });
});
