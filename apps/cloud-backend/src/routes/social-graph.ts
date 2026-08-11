import { Hono } from 'hono';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

app.post('/co-occurrence', async (c) => {
  try {
    const { eventId, faceVector } = await c.req.json();
    if (!eventId || !faceVector) {
      return c.json({ error: 'Missing eventId or faceVector' }, 400);
    }

    // Co-occurrence query simulating Cloudflare Vectorize face similarity + co-presence
    return c.json({
      success: true,
      clusters: [
        {
          groupName: 'Resort Pool Group',
          coOccurrenceCount: 9,
          sharedPhotoIds: ['photo_101', 'photo_105', 'photo_112'],
          viralShareUrl: `https://gallery.clickflash.app/share?event=${eventId}&group=pool`,
        },
      ],
    });
  } catch (error: any) {
    return c.json({ error: 'Social graph analysis failed' }, 500);
  }
});

export default app;
