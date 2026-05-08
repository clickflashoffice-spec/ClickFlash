import { http, HttpResponse } from 'msw';

export const syncHandlers = [
  http.post('/api/sync/mutation', async ({ request }) => {
    const body = await request.json() as { collection: string; operation: string; id: string };
    
    return HttpResponse.json({
      success: true,
      mutationId: 'mut-' + Date.now(),
      collection: body.collection,
      operation: body.operation,
      id: body.id,
      timestamp: new Date().toISOString(),
    });
  }),

  http.get('/api/sync/status', () => {
    return HttpResponse.json({
      success: true,
      connected: true,
      lastPing: new Date().toISOString(),
      pendingCount: 0,
    });
  }),

  http.post('/api/sync/pull', () => {
    return HttpResponse.json({
      success: true,
      mutations: [],
      lastSyncTimestamp: new Date().toISOString(),
    });
  }),
];
