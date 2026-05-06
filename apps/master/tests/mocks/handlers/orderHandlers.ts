import { http, HttpResponse } from 'msw';

export const orderHandlers = [
  http.get('/api/orders', () => {
    return HttpResponse.json({
      success: true,
      orders: [
        {
          id: 'order-1',
          orderNumber: 'CF-2024-0001',
          status: 'paid',
          clientName: 'John Smith',
          email: 'john@example.com',
          total: 299.99,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'order-2',
          orderNumber: 'CF-2024-0002',
          status: 'pending',
          clientName: 'Jane Doe',
          email: 'jane@example.com',
          total: 149.99,
          createdAt: new Date().toISOString(),
        },
      ],
      total: 2,
      page: 1,
      perPage: 20,
    });
  }),

  http.get('/api/orders/:id', ({ params }) => {
    const { id } = params;
    
    return HttpResponse.json({
      success: true,
      order: {
        id,
        orderNumber: 'CF-2024-0001',
        status: 'paid',
        clientName: 'John Smith',
        email: 'john@example.com',
        items: [
          { id: 'item-1', name: '8x10 Print', price: 29.99, quantity: 2 },
          { id: 'item-2', name: 'Digital Package', price: 239.99, quantity: 1 },
        ],
        total: 299.99,
        createdAt: new Date().toISOString(),
      },
    });
  }),

  http.post('/api/orders', async ({ request }) => {
    const body = await request.json() as { albumId: string; items: Array<{ id: string; quantity: number }> };
    
    return HttpResponse.json({
      success: true,
      order: {
        id: 'order-new-' + Date.now(),
        orderNumber: 'CF-2024-' + String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
        status: 'pending',
        items: body.items,
        createdAt: new Date().toISOString(),
      },
    }, { status: 201 });
  }),

  http.patch('/api/orders/:id/status', async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as { status: string };
    
    return HttpResponse.json({
      success: true,
      order: {
        id,
        status: body.status,
        updatedAt: new Date().toISOString(),
      },
    });
  }),
];
