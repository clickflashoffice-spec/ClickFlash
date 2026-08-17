import { Hono } from 'hono';
import { requireServiceAuth } from '../auth';
import type { AppEnv } from '../types';
import { 
  analyzeLocationScoutWithGemini, 
  analyzeFleetManagerWithGemini, 
  analyzeCEOInsightsWithGemini 
} from '../services/gemini-intelligence';

const app = new Hono<AppEnv>();
app.use('*', requireServiceAuth);

app.post('/scout', async (c) => {
  try {
    const { zonesData } = await c.req.json().catch(() => ({ zonesData: {} }));
    
    let d1Telemetry: any = {};
    try {
      const tenantId = c.get('tenantId');
      const [shiftsRes, sessionsRes, txRes] = await Promise.all([
        c.get('DB').prepare(`SELECT * FROM shifts WHERE tenant_id = ? ORDER BY timestamp DESC LIMIT 50`).bind(tenantId).all(),
        c.get('DB').prepare(`SELECT * FROM sessions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50`).bind(tenantId).all(),
        c.get('DB').prepare(`SELECT * FROM transactions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50`).bind(tenantId).all()
      ]);
      d1Telemetry = {
        recentShifts: shiftsRes.results || [],
        recentSessions: sessionsRes.results || [],
        recentTransactions: txRes.results || []
      };
    } catch (e) {
      // Gracefully handle telemetry fetch error
    }

    const enrichedZones = {
      clientPayload: zonesData,
      liveDatabaseTelemetry: d1Telemetry
    };

    const insights = await analyzeLocationScoutWithGemini(enrichedZones, c.env.GEMINI_API_KEY, c.get('DB'));
    return c.json({ success: true, insights });
  } catch (error: any) {
    return c.json({ error: 'AI Scout processing failed' }, 500);
  }
});

app.post('/manager', async (c) => {
  try {
    const { photographers } = await c.req.json().catch(() => ({ photographers: [] }));
    
    let d1Activity: any = {};
    try {
      const tenantId = c.get('tenantId');
      const [shiftsRes, sessionsRes] = await Promise.all([
        c.get('DB').prepare(`SELECT * FROM shifts WHERE tenant_id = ? ORDER BY timestamp DESC LIMIT 100`).bind(tenantId).all(),
        c.get('DB').prepare(`SELECT * FROM sessions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 100`).bind(tenantId).all()
      ]);
      d1Activity = {
        shifts: shiftsRes.results || [],
        sessions: sessionsRes.results || []
      };
    } catch (e) {
      // Gracefully handle telemetry fetch error
    }

    const enrichedPhotographers = Array.isArray(photographers) && photographers.length > 0
      ? { clientPhotographers: photographers, liveDatabaseActivity: d1Activity }
      : { clientPhotographers: [], liveDatabaseActivity: d1Activity };

    const flags = await analyzeFleetManagerWithGemini(enrichedPhotographers as any, c.env.GEMINI_API_KEY, c.get('DB'));
    return c.json({ success: true, flags });
  } catch (error: any) {
    return c.json({ error: 'AI Manager processing failed' }, 500);
  }
});

app.post('/ceo', async (c) => {
  try {
    const { financialData } = await c.req.json().catch(() => ({ financialData: {} }));
    
    let d1Financials: any = {};
    try {
      const tenantId = c.get('tenantId');
      const txRes = await c.get('DB').prepare(`SELECT * FROM transactions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 200`).bind(tenantId).all();
      const sessionsRes = await c.get('DB').prepare(`SELECT status, count(*) as count FROM sessions WHERE tenant_id = ? GROUP BY status`).bind(tenantId).all();
      d1Financials = {
        recentTransactions: txRes.results || [],
        sessionsByStatus: sessionsRes.results || []
      };
    } catch (e) {
      // Gracefully handle telemetry fetch error
    }

    const enrichedFinancials = {
      clientPayload: financialData,
      liveDatabaseFinancials: d1Financials
    };

    const ceoData = await analyzeCEOInsightsWithGemini(enrichedFinancials, c.env.GEMINI_API_KEY, c.get('DB'));
    return c.json({ success: true, ...ceoData });
  } catch (error: any) {
    return c.json({ error: 'AI CEO processing failed' }, 500);
  }
});

app.post('/query', async (c) => {
  try {
    const { query, context } = await c.req.json();
    if (!query) return c.json({ error: 'Missing query text' }, 400);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${c.env.GEMINI_API_KEY}`;
    const prompt = `You are the ClickFlash Ecosystem AI Assistant.
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
    return c.json({ error: 'AI Query failed' }, 500);
  }
});

app.post('/face-search', async (c) => {
  try {
    const { image } = await c.req.json();
    if (!image) return c.json({ error: 'Missing image data' }, 400);

    // Call AI Worker (FastAPI) to extract ArcFace 512D Vector
    // Simulated here as the DB doesn't have Vectorize bound yet
    const simulatedMatches = [
      {
        id: `photo_vector_matched_${Date.now()}`,
        url: 'https://images.unsplash.com/photo-1522881113594-5dbfa6eb18f2?w=800',
        watermarkedUrl: 'https://images.unsplash.com/photo-1522881113594-5dbfa6eb18f2?w=800',
        aiTags: ['happy', 'vacation', 'face-match'],
      }
    ];

    return c.json({ success: true, matches: simulatedMatches });
  } catch (error: any) {
    return c.json({ error: 'Face search failed' }, 500);
  }
});

export default app;
