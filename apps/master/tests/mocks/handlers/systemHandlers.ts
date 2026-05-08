import { http, HttpResponse } from 'msw';

export const systemHandlers = [
  http.get('/api/health', () => {
    return HttpResponse.json({
      success: true,
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }),

  http.get('/api/system/info', () => {
    return HttpResponse.json({
      success: true,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: '39.2.7',
      appVersion: '4.2.0',
      memoryUsage: process.memoryUsage(),
    });
  }),

  http.get('/api/system/stats', () => {
    return HttpResponse.json({
      success: true,
      cpuUsage: 45.5,
      memoryUsage: 67.2,
      diskUsage: 23.1,
      networkLatency: 12,
    });
  }),

  http.post('/api/system/backup', () => {
    return HttpResponse.json({
      success: true,
      backupId: 'backup-' + Date.now(),
      path: '/backups/master-2024-01-15.db',
      size: 45678912,
      createdAt: new Date().toISOString(),
    });
  }),

  http.post('/api/system/restore', () => {
    return HttpResponse.json({
      success: true,
      restoredAt: new Date().toISOString(),
    });
  }),
];
