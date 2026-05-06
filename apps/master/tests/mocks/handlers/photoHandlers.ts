import { http, HttpResponse } from 'msw';

export const photoHandlers = [
  http.get('/api/collections/photos/records', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('perPage') || '20');
    
    return HttpResponse.json({
      success: true,
      items: [
        {
          id: 'photo-1',
          albumId: 'album-1',
          title: 'Sunset Portrait',
          url: '/photos/sunset-1.jpg',
          thumbnailUrl: '/photos/thumbs/sunset-1.jpg',
          category: 'print',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'photo-2',
          albumId: 'album-1',
          title: 'Beach Shot',
          url: '/photos/beach-1.jpg',
          thumbnailUrl: '/photos/thumbs/beach-1.jpg',
          category: 'digital',
          createdAt: new Date().toISOString(),
        },
      ],
      totalItems: 2,
      page,
      perPage,
      totalPages: 1,
    });
  }),

  http.get('/api/collections/albums/records', () => {
    return HttpResponse.json({
      success: true,
      items: [
        {
          id: 'album-1',
          name: 'Smith Wedding',
          coverPhotoUrl: '/photos/thumbs/sunset-1.jpg',
          photoCount: 150,
          createdAt: new Date().toISOString(),
        },
      ],
      totalItems: 1,
      page: 1,
      perPage: 20,
    });
  }),

  http.post('/api/collections/photos/records', async ({ request }) => {
    return HttpResponse.json({
      success: true,
      id: 'photo-new-' + Date.now(),
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.patch('/api/collections/photos/records/:id', async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    
    return HttpResponse.json({
      success: true,
      id,
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),
];
