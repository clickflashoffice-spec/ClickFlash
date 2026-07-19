import { Hono } from 'hono';
import { env } from 'hono/adapter';
import { cors } from 'hono/cors';
import { Resend } from 'resend';
import { analyzeImageWithGemini } from './services/gemini-tagger';
import { 
  analyzeLocationScoutWithGemini, 
  analyzeFleetManagerWithGemini, 
  analyzeCEOInsightsWithGemini 
} from './services/gemini-intelligence';

type Bindings = {
  PHOTO_BUCKET: R2Bucket;
  DB_MENA: D1Database;
  DB_EU: D1Database;
  DB_AMER: D1Database;
  DB_APAC: D1Database;
  AI_TAGGER_QUEUE: Queue;
  GEMINI_API_KEY: string;
  RESEND_API_KEY: string;
};

function getRegionalDB(env: Bindings, regionId?: string): D1Database {
  switch (regionId?.toUpperCase()) {
    case 'EU': return env.DB_EU;
    case 'AMER': return env.DB_AMER;
    case 'APAC': return env.DB_APAC;
    case 'MENA':
    default: return env.DB_MENA;
  }
}

const app = new Hono<{ Bindings: Bindings; Variables: { DB: D1Database } }>();

app.use('*', cors());

// Data Sovereignty Routing Middleware
app.use('*', async (c, next) => {
  const regionId = c.req.header('X-Region-ID') || c.req.query('region_id') || 'MENA';
  c.set('DB', getRegionalDB(c.env, regionId));
  await next();
});

app.get('/', (c) => {
  return c.text('ClickFlash Cloud Backend API is running!');
});

app.post('/api/ingest', async (c) => {
  try {
    const formData = await c.req.parseBody();
    
    const file = formData['photo'] as File;
    const eventName = formData['eventName'] as string;
    const accessCode = formData['accessCode'] as string;
    const cameraId = (formData['cameraId'] as string) || 'unknown';

    if (!file || !eventName || !accessCode) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // 1. Ensure Event Exists
    const eventId = eventName.toLowerCase().replace(/\s+/g, '-');
    await c.get('DB').prepare(
      `INSERT INTO events (id, name, access_code) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING`
    ).bind(eventId, eventName, accessCode).run();

    // 2. Upload to R2
    const photoId = crypto.randomUUID();
    const r2Path = `events/${eventId}/${photoId}.jpg`;
    
    await c.env.PHOTO_BUCKET.put(r2Path, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || 'image/jpeg' }
    });

    const rawFile = formData['rawPhoto'] as File | undefined;
    const rawMetadata = (formData['rawMetadata'] as string) || null;
    let rawR2Path: string | null = null;
    let rawSize: number | null = null;
    let rawStatus = 'pending';

    if (rawFile) {
      const ext = rawFile.name ? rawFile.name.split('.').pop()?.toLowerCase() || 'raw' : 'raw';
      rawR2Path = `events/${eventId}/${photoId}.${ext}`;
      await c.env.PHOTO_BUCKET.put(rawR2Path, await rawFile.arrayBuffer(), {
        httpMetadata: { contentType: rawFile.type || 'application/octet-stream' }
      });
      rawSize = rawFile.size;
      rawStatus = 'uploaded';
    }

    // 3. Save Metadata to D1
    await c.get('DB').prepare(
      `INSERT INTO photos (id, event_id, r2_path, size, camera_id, raw_r2_path, raw_size, raw_status, raw_metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(photoId, eventId, r2Path, file.size, cameraId, rawR2Path, rawSize, rawStatus, rawMetadata).run();

    // 4. Queue for Background AI Tagging (Gemini/Vision)
    const regionId = c.req.header('X-Region-ID') || c.req.query('region_id') || 'MENA';
    await c.env.AI_TAGGER_QUEUE.send({ photoId, r2Path, mimeType: file.type || 'image/jpeg', regionId });

    return c.json({ 
      success: true, 
      photoId, 
      path: r2Path 
    });

  } catch (error: any) {
    console.error('Ingest Error:', error);
    return c.json({ error: 'Internal Server Error', details: error.message }, 500);
  }
});

// ==========================================
// GALLERY ENDPOINTS
// ==========================================

// Authenticate guest via Access Code
app.post('/api/gallery-auth/login', async (c) => {
  try {
    const { accessCode } = await c.req.json();
    if (!accessCode) return c.json({ error: 'Missing accessCode' }, 400);

    const event = await c.get('DB').prepare(
      `SELECT * FROM events WHERE access_code = ?`
    ).bind(accessCode).first();

    if (!event) return c.json({ error: 'Invalid access code' }, 401);

    // Simple mock JWT payload for prototype
    const mockToken = btoa(JSON.stringify({ eventId: event.id, accessCode }));
    
    return c.json({
      success: true,
      token: mockToken,
      event
    });
  } catch (error: any) {
    return c.json({ error: 'Internal Server Error', details: error.message }, 500);
  }
});

// Generate dynamic QR token for Self-Service Kiosk (15-min expiry)
app.post('/api/qr/generate', async (c) => {
  try {
    const { eventId, accessCode } = await c.req.json();
    if (!eventId || !accessCode) return c.json({ error: 'Missing eventId or accessCode' }, 400);

    const token = crypto.randomUUID();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    await c.get('DB').prepare(
      `INSERT INTO qr_tokens (token, event_id, access_code, expires_at) VALUES (?, ?, ?, ?)`
    ).bind(token, eventId, accessCode, expiresAt).run();

    return c.json({
      success: true,
      token,
      expiresAt,
      url: `https://gallery.clickflash.com/connect?token=${token}`
    });
  } catch (error: any) {
    return c.json({ error: 'Failed to generate QR token', details: error.message }, 500);
  }
});

// Validate dynamic QR token and return auth session
app.post('/api/qr/validate', async (c) => {
  try {
    const { token } = await c.req.json();
    if (!token) return c.json({ error: 'Missing token' }, 400);

    const record = await c.get('DB').prepare(
      `SELECT * FROM qr_tokens WHERE token = ?`
    ).bind(token).first();

    if (!record) return c.json({ error: 'Invalid token' }, 401);
    if (Date.now() > Number(record.expires_at)) {
      return c.json({ error: 'Token expired' }, 401);
    }

    const event = await c.get('DB').prepare(
      `SELECT * FROM events WHERE id = ?`
    ).bind(record.event_id).first();

    const mockToken = btoa(JSON.stringify({ eventId: record.event_id, accessCode: record.access_code }));

    return c.json({
      success: true,
      token: mockToken,
      event: event || { id: record.event_id, access_code: record.access_code, name: 'Event' }
    });
  } catch (error: any) {
    return c.json({ error: 'Failed to validate QR token', details: error.message }, 500);
  }
});

// Fetch photos for an authenticated event
app.get('/api/photos', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const tokenPayload = JSON.parse(atob(authHeader.split(' ')[1]));
    const eventId = tokenPayload.eventId;

    if (!eventId) return c.json({ error: 'Invalid token' }, 401);

    const { results } = await c.get('DB').prepare(
      `SELECT * FROM photos WHERE event_id = ? ORDER BY id DESC`
    ).bind(eventId).all();

    // Map D1 results to Gallery Photo types
    const photos = results.map((row: any) => ({
      id: row.id,
      url: `/api/photos/${row.id}/download-url`, // In a real app this would be a public R2 URL or presigned URL
      title: row.camera_id,
      aiTags: row.ai_tags ? JSON.parse(row.ai_tags) : null,
      size: row.size,
      rawUrl: row.raw_r2_path ? `https://clickflash-photos.public.r2.dev/${row.raw_r2_path}` : null,
      rawStatus: row.raw_status || 'pending',
      rawSize: row.raw_size || null,
      rawMetadata: row.raw_metadata ? JSON.parse(row.raw_metadata) : null
    }));

    return c.json({ success: true, photos });
  } catch (error: any) {
    return c.json({ error: 'Internal Server Error', details: error.message }, 500);
  }
});

// Generate secure download URL
app.get('/api/photos/:id/download-url', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.split(' ')[1];

  const photoId = c.req.param('id');
  const photo = await c.get('DB').prepare(
    `SELECT r2_path FROM photos WHERE id = ?`
  ).bind(photoId).first();

  if (!photo) return c.json({ error: 'Not found' }, 404);

  // Return a worker-proxied URL that includes the token for secure access
  // In production, you would generate a short-lived HMAC signed URL here.
  const baseUrl = new URL(c.req.url).origin;
  return c.json({
    success: true,
    downloadUrl: `${baseUrl}/api/photos/${photoId}/file?token=${token}`
  });
});

// Securely serve the actual file from R2
app.get('/api/photos/:id/file', async (c) => {
  const token = c.req.query('token');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  
  // Basic validation of token (in production, decode and verify JWT or HMAC)
  const decoded = atob(token);
  if (!decoded.includes('eventId')) return c.json({ error: 'Invalid token' }, 401);

  const photoId = c.req.param('id');
  const photo = await c.get('DB').prepare(
    `SELECT r2_path FROM photos WHERE id = ?`
  ).bind(photoId).first();

  if (!photo || !photo.r2_path) return c.json({ error: 'Not found' }, 404);

  const object = await c.env.PHOTO_BUCKET.get(photo.r2_path as string);
  if (!object) return c.json({ error: 'File not found in R2' }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Content-Disposition', `attachment; filename="ClickFlash_${photoId}.jpg"`);

  return new Response(object.body, {
    headers,
  });
});

// ==========================================
// BULK RAW EXPORT & DELIVERY (Phase 3 / Feature 6.7)
// ==========================================

app.post('/api/photos/raw/export-batch', async (c) => {
  try {
    const { eventId, filterTags } = await c.req.json();
    if (!eventId) return c.json({ error: 'Missing eventId' }, 400);

    const db = c.get('DB');
    const { results: photos } = await db.prepare(`SELECT * FROM photos WHERE event_id = ?`).bind(eventId).all();

    // Filter by tags if specified
    let filteredPhotos = photos;
    if (Array.isArray(filterTags) && filterTags.length > 0) {
      filteredPhotos = photos.filter((p: any) => {
        if (!p.ai_tags) return false;
        try {
          const tags = JSON.parse(p.ai_tags);
          return filterTags.some((tag: string) => tags.includes(tag));
        } catch {
          return false;
        }
      });
    }

    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();
    const totalFiles = filteredPhotos.length;

    // Create job record
    await db.prepare(
      `INSERT INTO raw_export_jobs (id, event_id, status, total_files, processed_files, export_r2_path, filter_tags, created_at, completed_at)
       VALUES (?, ?, 'completed', ?, ?, ?, ?, ?, ?)`
    ).bind(
      jobId,
      eventId,
      totalFiles,
      totalFiles,
      `exports/manifest-${jobId}.json`,
      filterTags ? JSON.stringify(filterTags) : null,
      now,
      now
    ).run();

    const manifest = {
      jobId,
      eventId,
      createdAt: now,
      totalFiles,
      filterTags: filterTags || [],
      items: filteredPhotos.map((p: any) => ({
        id: p.id,
        previewUrl: `/api/photos/${p.id}/download-url`,
        rawUrl: p.raw_r2_path ? `https://clickflash-photos.public.r2.dev/${p.raw_r2_path}` : null,
        rawStatus: p.raw_status || 'pending',
        rawSize: p.raw_size || 0,
        rawMetadata: p.raw_metadata ? JSON.parse(p.raw_metadata) : null,
        aiTags: p.ai_tags ? JSON.parse(p.ai_tags) : []
      }))
    };

    await c.env.PHOTO_BUCKET.put(`exports/manifest-${jobId}.json`, JSON.stringify(manifest, null, 2), {
      httpMetadata: { contentType: 'application/json' }
    });

    return c.json({
      success: true,
      jobId,
      totalFiles,
      status: 'completed',
      manifestUrl: `/api/photos/raw/export-jobs/${jobId}/manifest`
    });
  } catch (error: any) {
    return c.json({ error: 'Failed to initiate batch export', details: error.message }, 500);
  }
});

app.get('/api/photos/raw/export-jobs', async (c) => {
  try {
    const { results } = await c.get('DB').prepare(
      `SELECT * FROM raw_export_jobs ORDER BY created_at DESC LIMIT 50`
    ).all();
    return c.json({ success: true, jobs: results });
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch export jobs', details: error.message }, 500);
  }
});

app.get('/api/photos/raw/export-jobs/:id', async (c) => {
  try {
    const jobId = c.req.param('id');
    const job = await c.get('DB').prepare(
      `SELECT * FROM raw_export_jobs WHERE id = ?`
    ).bind(jobId).first();

    if (!job) return c.json({ error: 'Job not found' }, 404);
    return c.json({ success: true, job });
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch export job', details: error.message }, 500);
  }
});

app.get('/api/photos/raw/export-jobs/:id/manifest', async (c) => {
  try {
    const jobId = c.req.param('id');
    const object = await c.env.PHOTO_BUCKET.get(`exports/manifest-${jobId}.json`);
    if (!object) return c.json({ error: 'Manifest not found in storage' }, 404);

    const data = await object.json();
    return c.json(data);
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch manifest', details: error.message }, 500);
  }
});

// ==========================================
// AI INTELLIGENCE & WORKSPACE ENDPOINTS (Phase 3)
// ==========================================

app.post('/api/ai/scout', async (c) => {
  try {
    const { zonesData } = await c.req.json().catch(() => ({ zonesData: {} }));
    
    // Aggregate real D1 telemetry (`shifts`, `sessions`, `transactions`) to enrich zone intelligence
    let d1Telemetry: any = {};
    try {
      const [shiftsRes, sessionsRes, txRes] = await Promise.all([
        c.get('DB').prepare(`SELECT * FROM shifts ORDER BY timestamp DESC LIMIT 50`).all(),
        c.get('DB').prepare(`SELECT * FROM sessions ORDER BY created_at DESC LIMIT 50`).all(),
        c.get('DB').prepare(`SELECT * FROM transactions ORDER BY created_at DESC LIMIT 50`).all()
      ]);
      d1Telemetry = {
        recentShifts: shiftsRes.results || [],
        recentSessions: sessionsRes.results || [],
        recentTransactions: txRes.results || []
      };
    } catch (e) {
      console.warn('Could not aggregate D1 telemetry for Scout, proceeding with client payload only.');
    }

    const enrichedZones = {
      clientPayload: zonesData,
      liveDatabaseTelemetry: d1Telemetry
    };

    const insights = await analyzeLocationScoutWithGemini(enrichedZones, c.env.GEMINI_API_KEY);
    return c.json({ success: true, insights });
  } catch (error: any) {
    console.error('AI Scout Error:', error);
    return c.json({ error: 'AI Scout processing failed', details: error.message }, 500);
  }
});

app.post('/api/ai/manager', async (c) => {
  try {
    const { photographers } = await c.req.json().catch(() => ({ photographers: [] }));
    
    // Enrich with real D1 photographer shifts and session status
    let d1Activity: any = {};
    try {
      const [shiftsRes, sessionsRes] = await Promise.all([
        c.get('DB').prepare(`SELECT * FROM shifts ORDER BY timestamp DESC LIMIT 100`).all(),
        c.get('DB').prepare(`SELECT * FROM sessions ORDER BY created_at DESC LIMIT 100`).all()
      ]);
      d1Activity = {
        shifts: shiftsRes.results || [],
        sessions: sessionsRes.results || []
      };
    } catch (e) {
      console.warn('Could not aggregate D1 activity for Manager, proceeding with client payload only.');
    }

    const enrichedPhotographers = Array.isArray(photographers) && photographers.length > 0
      ? { clientPhotographers: photographers, liveDatabaseActivity: d1Activity }
      : { clientPhotographers: [], liveDatabaseActivity: d1Activity };

    const flags = await analyzeFleetManagerWithGemini(enrichedPhotographers as any, c.env.GEMINI_API_KEY);
    return c.json({ success: true, flags });
  } catch (error: any) {
    console.error('AI Manager Error:', error);
    return c.json({ error: 'AI Manager processing failed', details: error.message }, 500);
  }
});

app.post('/api/ai/ceo', async (c) => {
  try {
    const { financialData } = await c.req.json().catch(() => ({ financialData: {} }));
    
    // Enrich with real D1 financial transactions
    let d1Financials: any = {};
    try {
      const txRes = await c.get('DB').prepare(`SELECT * FROM transactions ORDER BY created_at DESC LIMIT 200`).all();
      const sessionsRes = await c.get('DB').prepare(`SELECT status, count(*) as count FROM sessions GROUP BY status`).all();
      d1Financials = {
        recentTransactions: txRes.results || [],
        sessionsByStatus: sessionsRes.results || []
      };
    } catch (e) {
      console.warn('Could not aggregate D1 financials for CEO, proceeding with client payload only.');
    }

    const enrichedFinancials = {
      clientPayload: financialData,
      liveDatabaseFinancials: d1Financials
    };

    const ceoData = await analyzeCEOInsightsWithGemini(enrichedFinancials, c.env.GEMINI_API_KEY);
    return c.json({ success: true, ...ceoData });
  } catch (error: any) {
    console.error('AI CEO Error:', error);
    return c.json({ error: 'AI CEO processing failed', details: error.message }, 500);
  }
});

app.post('/api/ai/query', async (c) => {
  try {
    const { query, context } = await c.req.json();
    if (!query) return c.json({ error: 'Missing query text' }, 400);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${c.env.GEMINI_API_KEY}`;
    const prompt = `You are the Fotiqo Ecosystem AI Assistant.
Context data: ${JSON.stringify(context || {})}
User Query: "${query}"
Answer concisely, authoritatively, and provide strategic recommendations.`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { response_mime_type: "application/json" }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`Gemini Query Error: ${res.status}`);
    const data: any = await res.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis returned.";
    return c.json({ success: true, answer });
  } catch (error: any) {
    console.error('AI Query Error:', error);
    return c.json({ error: 'AI Query failed', details: error.message }, 500);
  }
});
// ==========================================
// ECOSYSTEM SYNCHRONIZATION (Phase 15)
// ==========================================

// Master PC fetches Global Settings to propagate to Kiosks & Mobile Apps
app.get('/api/settings/sync', async (c) => {
  try {
    const { results } = await c.get('DB').prepare(
      `SELECT * FROM global_settings`
    ).all();
    
    // Convert array of K/V pairs to a single config object
    const settings = results.reduce((acc: any, row: any) => {
      acc[row.key] = JSON.parse(row.value);
      return acc;
    }, {});
    
    // Calculate max version to return as the fleet version
    const fleetVersion = results.reduce((max: number, row: any) => Math.max(max, row.version || 1), 1);

    return c.json({ success: true, settings, fleetVersion, timestamp: Date.now() });
  } catch (error: any) {
    return c.json({ error: 'Failed to sync settings', details: error.message }, 500);
  }
});

// Management Web App updates Global Settings
app.post('/api/settings/update', async (c) => {
  try {
    const { key, value } = await c.req.json();
    if (!key || value === undefined) return c.json({ error: 'Missing key or value' }, 400);

    const id = crypto.randomUUID();
    const now = Date.now();
    const strValue = JSON.stringify(value);

    await c.get('DB').prepare(
      `INSERT INTO global_settings (id, key, value, version, updated_at) VALUES (?, ?, ?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, version=global_settings.version + 1, updated_at=excluded.updated_at`
    ).bind(id, key, strValue, now).run();

    // In a real implementation, we would fire a WebSocket push here to all connected Master PCs
    
    return c.json({ success: true, message: 'Settings updated globally' });
  } catch (error: any) {
    return c.json({ error: 'Failed to update settings', details: error.message }, 500);
  }
});

// Unified endpoint for Master PC sync (CloudSyncService.ts)
app.get('/api/cloud/sync/settings', async (c) => {
  try {
    const clientHash = c.req.query('hash') || '';
    const { results } = await c.get('DB').prepare(
      `SELECT * FROM global_settings`
    ).all();

    // Compute simple deterministic hash from version and updated_at
    const currentHash = results.map((r: any) => `${r.key}:${r.version}:${r.updated_at}`).join('|');
    if (clientHash && clientHash === currentHash) {
      return c.json({ changed: false, hash: currentHash, settings: [] });
    }

    const settings = results.map((r: any) => ({
      id: r.key,
      key: r.key,
      value: r.value
    }));

    return c.json({ changed: true, hash: currentHash, settings });
  } catch (error: any) {
    return c.json({ error: 'Failed to sync remote settings', details: error.message }, 500);
  }
});

// ==========================================
// MASTER PC SYNC ENGINE (UP/DOWN SYNC)
// ==========================================

app.post('/api/sync/up', async (c) => {
  try {
    const { deskId, payloads } = await c.req.json();
    if (!deskId || !payloads) return c.json({ error: 'Missing deskId or payloads' }, 400);

    const db = c.get('DB');
    const statements: D1PreparedStatement[] = [];

    // 1. Sync Sessions
    if (payloads.sessions && Array.isArray(payloads.sessions)) {
      const stmt = db.prepare(
        `INSERT INTO sessions (id, resort_id, photographer_id, guest_name, status, sync_status, customer_email, customer_phone, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET 
           status=excluded.status, sync_status=excluded.sync_status,
           customer_email=excluded.customer_email, customer_phone=excluded.customer_phone`
      );
      for (const session of payloads.sessions) {
        statements.push(stmt.bind(
          session.id, session.resortId || 'RESORT_01', session.photographerId || null, 
          session.guestName || 'Guest', session.status || 'ACTIVE', 'SYNCED',
          session.customerEmail || null, session.customerPhone || null, 
          session.createdAt || new Date().toISOString()
        ));
      }
    }

    // 2. Sync Transactions
    if (payloads.transactions && Array.isArray(payloads.transactions)) {
      const stmt = db.prepare(
        `INSERT INTO transactions (id, session_id, stripe_payment_intent_id, amount, currency, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET status=excluded.status`
      );
      for (const tx of payloads.transactions) {
        statements.push(stmt.bind(
          tx.id, tx.sessionId, tx.stripePaymentIntentId || null, 
          tx.amount, tx.currency || 'EUR', tx.status || 'COMPLETED',
          tx.createdAt || new Date().toISOString()
        ));
      }
    }

    // 3. Sync Shifts
    if (payloads.shifts && Array.isArray(payloads.shifts)) {
      const stmt = db.prepare(
        `INSERT INTO shifts (id, photographer_id, type, timestamp, latitude, longitude, station_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`
      );
      for (const shift of payloads.shifts) {
        statements.push(stmt.bind(
          shift.id, shift.photographerId, shift.type, shift.timestamp,
          shift.latitude || null, shift.longitude || null, shift.stationId || deskId
        ));
      }
    }

    if (statements.length > 0) {
      await db.batch(statements);
    }

    return c.json({ success: true, message: `Up-sync completed. Processed ${statements.length} records.` });
  } catch (error: any) {
    return c.json({ error: 'Up-sync failed', details: error.message }, 500);
  }
});

app.post('/api/sync/down', async (c) => {
  try {
    const { deskId, lastSyncTimestamp } = await c.req.json();
    if (!deskId) return c.json({ error: 'Missing deskId' }, 400);

    const db = c.get('DB');
    const timestamp = lastSyncTimestamp || '1970-01-01T00:00:00Z';

    const [bookingsRes, packsRes, rostersRes] = await db.batch([
      db.prepare(`SELECT * FROM bookings WHERE updated_at >= ?`).bind(timestamp),
      db.prepare(`SELECT * FROM packs WHERE updated_at >= ?`).bind(timestamp),
      db.prepare(`SELECT * FROM rosters WHERE updated_at >= ? AND station_id = ?`).bind(timestamp, deskId)
    ]);

    return c.json({
      success: true,
      bookings: bookingsRes.results || [],
      packs: packsRes.results || [],
      rosters: rostersRes.results || [],
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({ error: 'Down-sync failed', details: error.message }, 500);
  }
});

// Unified endpoints for Management Web App (remoteConfigService.ts)
app.get('/api/cloud/config/current', async (c) => {
  try {
    const { results } = await c.get('DB').prepare(
      `SELECT * FROM global_settings`
    ).all();

    const configMap: Record<string, any> = {};
    for (const row of results as any[]) {
      try {
        configMap[row.key] = JSON.parse(row.value);
      } catch {
        configMap[row.key] = row.value;
      }
    }

    const currentVersion = results.reduce((max: number, row: any) => Math.max(max, row.version || 1), 1);
    return c.json({
      version: String(currentVersion),
      lastModified: new Date().toISOString(),
      modifiedBy: 'system',
      pricing: configMap.pricing || [],
      watermark: configMap.watermark || {},
      branding: configMap.branding || {},
      features: configMap.features || {},
      limits: configMap.limits || { maxPhotosPerAlbum: 500, maxAlbumSize: 5000, maxUploadSize: 100 }
    });
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch remote config', details: error.message }, 500);
  }
});

app.post('/api/cloud/config/push', async (c) => {
  try {
    const { config, target, message } = await c.req.json();
    if (!config) return c.json({ error: 'Missing config payload' }, 400);

    const now = Date.now();
    for (const [key, val] of Object.entries(config)) {
      if (val === undefined) continue;
      const id = crypto.randomUUID();
      const strValue = typeof val === 'string' ? val : JSON.stringify(val);
      await c.get('DB').prepare(
        `INSERT INTO global_settings (id, key, value, version, updated_at) VALUES (?, ?, ?, 1, ?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value, version=global_settings.version + 1, updated_at=excluded.updated_at`
      ).bind(id, key, strValue, now).run();
    }

    // Also bump global hash/timestamp for quick detection by Master PCs
    await c.get('DB').prepare(
      `INSERT INTO global_settings (id, key, value, version, updated_at) VALUES ('remote_settings_hash', 'remote_settings_hash', ?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, version=global_settings.version + 1, updated_at=excluded.updated_at`
    ).bind(String(now), now).run();

    return c.json({ success: true, deliveredTo: 1, failedTargets: [], version: String(now) });
  } catch (error: any) {
    return c.json({ error: 'Failed to push config', details: error.message }, 500);
  }
});

app.get('/api/cloud/config/history', async (c) => {
  return c.json([]);
});

// Master PC Syncs Local Sessions up to Cloudflare D1
app.post('/api/sessions/sync', async (c) => {
  try {
    const { sessions } = await c.req.json();
    if (!Array.isArray(sessions)) return c.json({ error: 'Expected array of sessions' }, 400);

    const stmt = c.get('DB').prepare(
      `INSERT INTO sessions (id, resort_id, photographer_id, guest_name, status, sync_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET status=excluded.status, sync_status='SYNCED'`
    );

    const batch = sessions.map(s => stmt.bind(
      s.id, s.resortId, s.photographerId, s.guestName, s.status, 'SYNCED', s.createdAt || Date.now()
    ));

    await c.get('DB').batch(batch);
    
    return c.json({ success: true, syncedCount: sessions.length });
  } catch (error: any) {
    return c.json({ error: 'Session sync failed', details: error.message }, 500);
  }
});

// Sync Shift Events (Clock In / Out) with Biometric & Station Metadata
app.post('/api/shifts', async (c) => {
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
      shift.id,
      shift.photographerId,
      shift.type,
      shift.timestamp,
      shift.latitude ?? null,
      shift.longitude ?? null,
      shift.biometricVerified ? 1 : 0,
      shift.biometricMethod || 'LOCAL_AUTH',
      shift.biometricConfidence ?? null,
      shift.faceVectorHash ?? null,
      shift.stationId ?? null
    ).run();
    
    return c.json({ success: true, message: 'Shift logged' });
  } catch (error: any) {
    return c.json({ error: 'Shift sync failed', details: error.message }, 500);
  }
});

// Fetch Shifts for Management & Station Monitoring
app.get('/api/shifts', async (c) => {
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
    return c.json({ error: 'Failed to fetch shifts', details: error.message }, 500);
  }
});

// Enroll Photographer Face Vector (Phase 19 Biometric Security)
app.post('/api/photographers/enroll-face', async (c) => {
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
      photographerId,
      name || `Photographer ${photographerId}`,
      stationId || null,
      JSON.stringify(faceVector),
      Date.now()
    ).run();

    return c.json({ success: true, message: 'Photographer face vector enrolled' });
  } catch (error: any) {
    return c.json({ error: 'Face vector enrollment failed', details: error.message }, 500);
  }
});

// Fetch Enrolled Face Vector for Offline LAN/Mobile Verification
app.get('/api/photographers/:id/face-vector', async (c) => {
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
        id: row.id,
        name: row.name,
        stationId: row.station_id,
        faceVector,
        faceEnrolledAt: row.face_enrolled_at,
      },
    });
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch photographer face vector', details: error.message }, 500);
  }
});

// Stripe Webhook (Payment confirmed -> mark Session PAID -> trigger Gallery Email)
app.post('/api/webhooks/stripe', async (c) => {
  try {
    const body = await c.req.json();
    const eventType = body.type;

    if (eventType === 'payment_intent.succeeded') {
      const paymentIntent = body.data.object;
      const sessionId = paymentIntent.metadata?.sessionId;

      if (sessionId) {
        // Record Transaction
        await c.get('DB').prepare(
          `INSERT INTO transactions (id, session_id, stripe_payment_intent_id, amount, currency, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(crypto.randomUUID(), sessionId, paymentIntent.id, paymentIntent.amount, paymentIntent.currency, 'SUCCEEDED', Date.now()).run();

        // Update Session Status
        await c.get('DB').prepare(
          `UPDATE sessions SET status = 'PAID' WHERE id = ?`
        ).bind(sessionId).run();

        // Trigger Gallery Email via Resend
        const sessionRow = await c.get('DB').prepare(
          `SELECT customer_email, guest_name FROM sessions WHERE id = ?`
        ).bind(sessionId).first();

        if (sessionRow && sessionRow.customer_email) {
          const resend = new Resend(c.env.RESEND_API_KEY);
          try {
            await resend.emails.send({
              from: 'ClickFlash Orders <orders@clickflash.com>',
              to: sessionRow.customer_email as string,
              subject: 'Your ClickFlash Gallery is Ready!',
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                  <h2>Hi ${sessionRow.guest_name || 'Guest'},</h2>
                  <p>Your payment was successful and your digital photo gallery is now unlocked!</p>
                  <p>You can view and download your high-resolution photos securely using the link below:</p>
                  <div style="margin: 30px 0;">
                    <a href="https://gallery.clickflash.com/session/${sessionId}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                      View My Gallery
                    </a>
                  </div>
                  <p>Thank you for choosing ClickFlash!</p>
                </div>
              `
            });
            console.log(`Gallery email sent to ${sessionRow.customer_email} via Resend`);
          } catch (emailErr) {
            console.error('Failed to send Resend email:', emailErr);
          }
        }
      }
    }

    return c.json({ received: true });
  } catch (error: any) {
    return c.json({ error: 'Webhook processing failed', details: error.message }, 500);
  }
});

// ==========================================
// FLEET MANAGEMENT (Phase 2)
// ==========================================

app.post('/api/masters/heartbeat', async (c) => {
  try {
    const payload = await c.req.json();
    const { masterId, name, version, metrics, status, sales } = payload;
    
    if (!masterId) return c.json({ error: 'Missing masterId' }, 400);

    const metricsJson = metrics ? JSON.stringify(metrics) : null;
    const salesJson = sales ? JSON.stringify(sales) : null;
    const now = new Date().toISOString();

    await c.get('DB').prepare(
      `INSERT INTO fleet_nodes (id, name, location, status, last_seen, version, metrics_json, orders_json, created_at)
       VALUES (?, ?, 'Unknown', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         status = excluded.status,
         last_seen = excluded.last_seen,
         version = excluded.version,
         metrics_json = excluded.metrics_json,
         orders_json = excluded.orders_json`
    ).bind(
      masterId, name || 'Master Node', status || 'online', now, version || 'unknown', metricsJson, salesJson
    ).run();

    return c.json({ success: true, timestamp: now });
  } catch (error: any) {
    console.error('Heartbeat Error:', error);
    return c.json({ error: 'Heartbeat failed', details: error.message }, 500);
  }
});

app.get('/api/cloud/fleet/status', async (c) => {
  try {
    const { results } = await c.get('DB').prepare(`SELECT status FROM fleet_nodes`).all();
    const total = results.length;
    const online = results.filter(r => r.status === 'online').length;
    const offline = results.filter(r => r.status === 'offline' || r.status === 'disconnected').length;
    const warning = results.filter(r => r.status === 'warning' || r.status === 'degraded').length;
    
    return c.json({ total, online, offline, warning });
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch status' }, 500);
  }
});

app.get('/api/cloud/fleet/stations', async (c) => {
  try {
    const { results } = await c.get('DB').prepare(`SELECT * FROM fleet_nodes ORDER BY last_seen DESC`).all();
    
    const stations = results.map(row => ({
      id: row.id,
      name: row.name,
      location: row.location,
      status: row.status,
      lastSeen: row.last_seen,
      version: row.version,
      metrics: row.metrics_json ? JSON.parse(row.metrics_json as string) : undefined,
      syncStatus: row.sync_status_json ? JSON.parse(row.sync_status_json as string) : undefined,
      orders: row.orders_json ? JSON.parse(row.orders_json as string) : undefined,
      photos: row.photos_json ? JSON.parse(row.photos_json as string) : undefined
    }));
    
    return c.json(stations);
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch stations' }, 500);
  }
});

app.get('/api/cloud/fleet/stations/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const row = await c.get('DB').prepare(`SELECT * FROM fleet_nodes WHERE id = ?`).bind(id).first();
    
    if (!row) return c.json({ error: 'Not found' }, 404);
    
    const station = {
      id: row.id,
      name: row.name,
      location: row.location,
      status: row.status,
      lastSeen: row.last_seen,
      version: row.version,
      metrics: row.metrics_json ? JSON.parse(row.metrics_json as string) : undefined,
      syncStatus: row.sync_status_json ? JSON.parse(row.sync_status_json as string) : undefined,
      orders: row.orders_json ? JSON.parse(row.orders_json as string) : undefined,
      photos: row.photos_json ? JSON.parse(row.photos_json as string) : undefined
    };
    return c.json(station);
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch station details' }, 500);
  }
});

app.post('/api/cloud/fleet/stations/:id/heartbeat', async (c) => {
  // Pinging the station - in a real app this would use a WebSocket or durable object to trigger an immediate check
  // For now, we simulate a successful ping if the station exists.
  const id = c.req.param('id');
  return c.json({ success: true, message: `Ping requested for ${id}` });
});

app.post('/api/cloud/fleet/stations/:id/sync', async (c) => {
  const id = c.req.param('id');
  return c.json({ success: true, message: `Sync requested for ${id}` });
});

app.post('/api/cloud/fleet/sync-all', async (c) => {
  return c.json({ success: true, message: `Sync all requested` });
});

// ==========================================
// ANALYTICS (Phase 2)
// ==========================================

app.get('/api/analytics/revenue', async (c) => {
  try {
    const { results } = await c.get('DB').prepare(
      `SELECT DATE(created_at) as date, SUM(amount) as revenue 
       FROM transactions 
       WHERE status = 'SUCCEEDED' 
       GROUP BY DATE(created_at) 
       ORDER BY date DESC 
       LIMIT 30`
    ).all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch revenue analytics', details: error.message }, 500);
  }
});

app.get('/api/analytics/conversion', async (c) => {
  try {
    const { results } = await c.get('DB').prepare(
      `SELECT 
         DATE(created_at) as date,
         COUNT(id) as total_sessions,
         SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) as paid_sessions
       FROM sessions
       GROUP BY DATE(created_at)
       ORDER BY date DESC
       LIMIT 30`
    ).all();
    
    const data = results.map((row: any) => ({
      ...row,
      conversion_rate: row.total_sessions > 0 ? (row.paid_sessions / row.total_sessions) * 100 : 0
    }));

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch conversion analytics', details: error.message }, 500);
  }
});

// ==========================================
// NOTIFICATIONS (Phase 2)
// ==========================================

app.post('/api/notifications/ready', async (c) => {
  try {
    const { sessionId } = await c.req.json();
    if (!sessionId) return c.json({ error: 'Missing sessionId' }, 400);

    const session = await c.get('DB').prepare(
      `SELECT * FROM sessions WHERE id = ?`
    ).bind(sessionId).first();

    if (!session || !session.customer_email) {
      return c.json({ error: 'Session not found or missing customer_email' }, 404);
    }

    const resend = new Resend(c.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'ClickFlash <no-reply@clickflash.com>',
      to: session.customer_email as string,
      subject: 'Your photos are ready!',
      html: `<p>Hi ${session.guest_name || 'Guest'},</p><p>Your photos from today's session are now ready to view and download!</p>`
    });

    if (session.push_token) {
      try {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: session.push_token,
            title: 'Your photos are ready! 📸',
            body: 'Tap here to view and download your memories.',
            data: { sessionId: session.id }
          })
        });
      } catch (e) {
        console.error('Push notification failed', e);
      }
    }

    await c.get('DB').prepare(
      `UPDATE sessions SET notified_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(sessionId).run();

    return c.json({ success: true, message: 'Ready notification sent' });
  } catch (error: any) {
    return c.json({ error: 'Failed to send notification', details: error.message }, 500);
  }
});

app.post('/api/push-token', async (c) => {
  try {
    const { sessionId, pushToken } = await c.req.json();
    if (!sessionId || !pushToken) return c.json({ error: 'Missing sessionId or pushToken' }, 400);

    // In a production app you might have a dedicated customers table. Here we attach it to the session.
    await c.get('DB').prepare(
      `UPDATE sessions SET push_token = ? WHERE id = ?`
    ).bind(pushToken, sessionId).run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: 'Failed to save push token', details: error.message }, 500);
  }
});

// ==========================================
// Phase 6 / Epic 5: Global Enterprise Scale
// ==========================================

// 1. Franchise Onboarding
app.post('/api/franchise/onboard', async (c) => {
  try {
    const body = await c.req.json();
    const { name, region_id, country, base_currency } = body;
    
    if (!name || !region_id) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    const db = getRegionalDB(c.env, region_id);
    const resortId = crypto.randomUUID();
    
    await db.prepare(
      `INSERT INTO resorts_config (id, name, region_id, country, base_currency) VALUES (?, ?, ?, ?, ?)`
    ).bind(resortId, name, region_id, country || null, base_currency || 'EUR').run();
    
    // Auto-create a default white-label config
    await db.prepare(
      `INSERT INTO white_label_configs (id, resort_id, primary_color) VALUES (?, ?, ?)`
    ).bind(crypto.randomUUID(), resortId, '#38bdf8').run();

    // Mocking crypto key seed generation for licensing
    const keySeed = crypto.randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase();

    return c.json({ 
      success: true, 
      resort_id: resortId, 
      region_id,
      license_seed: keySeed,
      message: 'Franchise successfully onboarded'
    });
  } catch (error: any) {
    console.error('Franchise onboard error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// 2. White-Label Branding Engine
app.get('/api/resort/:resort_id/theme', async (c) => {
  try {
    const resortId = c.req.param('resort_id');
    const db = c.get('DB');
    
    const theme = await db.prepare(
      `SELECT * FROM white_label_configs WHERE resort_id = ?`
    ).bind(resortId).first();
    
    if (!theme) return c.json({ error: 'Theme not found' }, 404);
    return c.json(theme);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/resort/:resort_id/theme', async (c) => {
  try {
    const resortId = c.req.param('resort_id');
    const { logo_url, primary_color, domain_cname, receipt_footer } = await c.req.json();
    const db = c.get('DB');
    
    await db.prepare(
      `UPDATE white_label_configs SET logo_url = ?, primary_color = ?, domain_cname = ?, receipt_footer = ?, updated_at = CURRENT_TIMESTAMP WHERE resort_id = ?`
    ).bind(logo_url || null, primary_color || '#38bdf8', domain_cname || null, receipt_footer || null, resortId).run();
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// 3. SLA Monitoring & Command Center
app.get('/api/stations/sla-report', async (c) => {
  try {
    const db = c.get('DB');
    
    const nodesResponse = await db.prepare(`SELECT * FROM fleet_nodes ORDER BY last_seen DESC LIMIT 50`).all();
    
    // Mock regional SLA data for demonstration
    const regionSLA = {
      'MENA': '99.98',
      'EU': '99.92',
      'AMER': '99.99',
      'APAC': '99.85'
    };

    return c.json({ 
      regional_sla: regionSLA,
      nodes: nodesResponse.results || []
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// 4. Automated Payroll & Commission Engine
app.post('/api/payroll/calculate-commissions', async (c) => {
  try {
    const { start_date, end_date } = await c.req.json();
    const db = c.get('DB');
    
    // In a real system, we'd aggregate sessions & transactions per photographer.
    // For Epic 5 simulation, we return a structured payroll ledger.
    const mockPayroll = [
      {
        photographer_id: 'photo-101',
        name: 'Alex Costa',
        sessions: 45,
        conversion_rate: 0.32,
        base_pay: 1500,
        commission_tier: 'Tier 3 (20%)',
        commission_amount: 850,
        total_payout: 2350
      },
      {
        photographer_id: 'photo-102',
        name: 'Sara M',
        sessions: 28,
        conversion_rate: 0.22,
        base_pay: 1200,
        commission_tier: 'Tier 2 (15%)',
        commission_amount: 420,
        total_payout: 1620
      }
    ];

    return c.json({
      period: { start_date, end_date },
      ledger: mockPayroll
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default {
  fetch: app.fetch,
  async scheduled(event: any, env: Bindings, ctx: ExecutionContext): Promise<void> {
    const db = getRegionalDB(env, 'MENA'); // Using MENA as primary for global cron in this prototype
    const resend = new Resend(env.RESEND_API_KEY);
    
    // Find abandoned carts (sessions older than 1 hour, not PAID, email not sent)
    // Using string manipulation for timestamp 1 hour ago in SQLite ISO8601 format
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { results } = await db.prepare(
      `SELECT * FROM sessions 
       WHERE status != 'PAID' 
       AND created_at < ? 
       AND abandoned_email_sent = 0
       AND customer_email IS NOT NULL`
    ).bind(oneHourAgo).all();

    for (const session of results) {
      try {
        await resend.emails.send({
          from: 'ClickFlash <no-reply@clickflash.com>',
          to: session.customer_email as string,
          subject: 'Your memories are waiting!',
          html: `<p>Hi ${session.guest_name || 'Guest'},</p><p>You left some amazing photos in your cart. Come back to ClickFlash and complete your order before they expire!</p>`
        });

        if (session.push_token) {
          try {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: session.push_token,
                title: 'Your memories are waiting! ⏳',
                body: 'Come back to ClickFlash and complete your order before they expire!',
                data: { sessionId: session.id }
              })
            });
          } catch (e) {
            console.error('Abandoned cart push failed', e);
          }
        }

        await db.prepare(
          `UPDATE sessions SET abandoned_email_sent = 1 WHERE id = ?`
        ).bind(session.id).run();
      } catch (e) {
        console.error('Failed to send abandoned cart email for session', session.id, e);
      }
    }
  },
  async queue(batch: MessageBatch<any>, env: Bindings): Promise<void> {
    for (const msg of batch.messages) {
      try {
        console.log(`Processing AI Tagging for Photo: ${msg.body.photoId}`);
        
        // 1. Fetch the image from env.PHOTO_BUCKET
        const object = await env.PHOTO_BUCKET.get(msg.body.r2Path);
        if (!object) {
          console.error(`Photo not found in R2: ${msg.body.r2Path}`);
          msg.ack();
          continue;
        }

        const buffer = await object.arrayBuffer();

        // 2. Send it to Gemini Vision API to get tags
        const tags = await analyzeImageWithGemini(
          buffer, 
          msg.body.mimeType || 'image/jpeg', 
          env.GEMINI_API_KEY
        );
        
        console.log(`Gemini output for ${msg.body.photoId}:`, tags);

        // 3. Update the D1 database \`ai_tags\` column
        const db = getRegionalDB(env, msg.body.regionId);
        await db.prepare(`UPDATE photos SET ai_tags = ? WHERE id = ?`)
          .bind(JSON.stringify(tags), msg.body.photoId)
          .run();
          
        msg.ack();
      } catch (err: any) {
        console.error(`Error processing photo ${msg.body.photoId}:`, err);
        // Do not ack the message if we want it to retry, or ack it to drop it.
        // For now, we'll retry on error.
        msg.retry();
      }
    }
  }
};
