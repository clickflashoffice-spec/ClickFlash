import { http, HttpResponse, type RequestHandler } from 'msw';
import { setupServer, type SetupServer } from 'msw/node';

export function createMockServer(handlers: RequestHandler[]): SetupServer {
  const server = setupServer(...handlers);
  return server;
}

export const mockApiHandlers = [
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok' });
  }),
  http.get('/api/photos', () => {
    return HttpResponse.json({
      data: [],
      pagination: { page: 1, limit: 20, total: 0 },
    });
  }),
  http.get('/api/albums', () => {
    return HttpResponse.json({
      data: [],
      pagination: { page: 1, limit: 20, total: 0 },
    });
  }),
];

export { http, HttpResponse };
export type { RequestHandler, SetupServer };
