import { http, HttpResponse } from 'msw';

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    
    if (body.email === 'admin@clickflash.photo' && body.password === 'admin123') {
      return HttpResponse.json({
        success: true,
        user: {
          id: 'user-1',
          email: body.email,
          name: 'Administrator',
          role: 'Admin',
        },
        token: 'mock-jwt-token-12345',
      });
    }
    
    return HttpResponse.json(
      { success: false, message: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true });
  }),

  http.get('/api/auth/session', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader?.includes('Bearer mock-jwt-token-12345')) {
      return HttpResponse.json({
        success: true,
        user: {
          id: 'user-1',
          email: 'admin@clickflash.photo',
          name: 'Administrator',
          role: 'Admin',
        },
      });
    }
    
    return HttpResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json() as { email: string; password: string; name: string };
    
    return HttpResponse.json({
      success: true,
      user: {
        id: 'user-new',
        email: body.email,
        name: body.name,
        role: 'User',
      },
      token: 'mock-jwt-token-new',
    });
  }),
];
