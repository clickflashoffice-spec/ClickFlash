import { Hono } from 'hono';
import { requireServiceAuth } from '../auth';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();
app.use('*', requireServiceAuth);

app.post('/shifts', async (c) => {
  try {
    const shift = await c.req.json();
    if (!shift.id || !shift.photographerId) return c.json({ error: 'Invalid shift event' }, 400);

    await c.get('DB').prepare(
      `INSERT INTO shifts (
         id, photographer_id, type, timestamp, latitude, longitude, 
         biometric_verified, biometric_method, biometric_confidence, face_vector_hash, station_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         biometric_verified = excluded.biometric_verified,
         biometric_method = excluded.biometric_method,
         biometric_confidence = excluded.biometric_confidence,
         face_vector_hash = excluded.face_vector_hash,
         station_id = excluded.station_id`
    ).bind(
      shift.id, shift.photographerId, shift.type, shift.timestamp,
      shift.latitude ?? null, shift.longitude ?? null,
      shift.biometricVerified ? 1 : 0, shift.biometricMethod || 'LOCAL_AUTH',
      shift.biometricConfidence ?? null, shift.faceVectorHash ?? null, shift.stationId ?? null
    ).run();
    
    return c.json({ success: true, message: 'Shift logged' });
  } catch (error: any) {
    return c.json({ error: 'Shift sync failed' }, 500);
  }
});

app.get('/shifts', async (c) => {
  try {
    const stationId = c.req.query('stationId');
    const photographerId = c.req.query('photographerId');

    let query = `SELECT * FROM shifts WHERE 1=1`;
    const params: any[] = [];

    if (stationId) {
      query += ` AND station_id = ?`;
      params.push(stationId);
    }
    if (photographerId) {
      query += ` AND photographer_id = ?`;
      params.push(photographerId);
    }

    query += ` ORDER BY timestamp DESC LIMIT 100`;

    const stmt = c.get('DB').prepare(query);
    const { results } = await (params.length > 0 ? stmt.bind(...params) : stmt).all();
    return c.json({ success: true, shifts: results });
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch shifts' }, 500);
  }
});

app.post('/photographers/enroll-face', async (c) => {
  try {
    const { photographerId, name, stationId, faceVector } = await c.req.json();
    if (!photographerId || !faceVector || !Array.isArray(faceVector)) {
      return c.json({ error: 'photographerId and valid faceVector array are required' }, 400);
    }

    await c.get('DB').prepare(
      `INSERT INTO photographers (id, name, station_id, face_vector, face_enrolled_at, created_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         station_id = COALESCE(excluded.station_id, photographers.station_id),
         face_vector = excluded.face_vector,
         face_enrolled_at = excluded.face_enrolled_at`
    ).bind(
      photographerId, name || `Photographer ${photographerId}`, stationId || null,
      JSON.stringify(faceVector), Date.now()
    ).run();

    return c.json({ success: true, message: 'Photographer face vector enrolled' });
  } catch (error: any) {
    return c.json({ error: 'Face vector enrollment failed' }, 500);
  }
});

app.get('/photographers/:id/face-vector', async (c) => {
  try {
    const id = c.req.param('id');
    const { results } = await c.get('DB').prepare(
      `SELECT id, name, station_id, face_vector, face_enrolled_at FROM photographers WHERE id = ?`
    ).bind(id).all();

    if (!results || results.length === 0) {
      return c.json({ error: 'Photographer not found or face vector unenrolled' }, 404);
    }

    const row: any = results[0];
    const faceVector = row.face_vector ? JSON.parse(row.face_vector) : null;

    return c.json({
      success: true,
      photographer: {
        id: row.id, name: row.name, stationId: row.station_id,
        faceVector, faceEnrolledAt: row.face_enrolled_at,
      },
    });
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch photographer face vector' }, 500);
  }
});

export default app;
