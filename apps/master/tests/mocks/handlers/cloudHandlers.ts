import { http, HttpResponse } from 'msw';

export const cloudHandlers = [
  http.get('/api/cloud/status', () => {
    return HttpResponse.json({
      success: true,
      status: 'connected',
      lastSync: new Date().toISOString(),
      pendingMutations: 0,
    });
  }),

  http.post('/api/cloud/sync', () => {
    return HttpResponse.json({
      success: true,
      syncId: 'sync-' + Date.now(),
      status: 'completed',
      mutatedRecords: 0,
    });
  }),

  http.get('/api/cloud/stats', () => {
    return HttpResponse.json({
      success: true,
      totalPhotos: 1250,
      totalAlbums: 12,
      totalOrders: 89,
      pendingSync: 0,
      lastBackup: new Date().toISOString(),
    });
  }),

  http.post('/api/cloud/retention', () => {
    return HttpResponse.json({
      success: true,
      processed: 0,
      freedBytes: 0,
    });
  }),
];
