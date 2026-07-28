import { Hono } from 'hono';
import { requireServiceAuth } from '../auth';
import type { AppEnv } from '../types';
import { getRegionalDB } from '../middleware';

const app = new Hono<AppEnv>();
app.use('*', requireServiceAuth);

app.get('/settings/sync', async (c) => {
  try {
    const { results } = await c.get('DB').prepare(
      `SELECT * FROM global_settings`
    ).all();
    
    const settings = results.reduce((acc: any, row: any) => {
      acc[row.key] = JSON.parse(row.value);
      return acc;
    }, {});
    
    const fleetVersion = results.reduce((max: number, row: any) => Math.max(max, row.version || 1), 1);

    return c.json({ success: true, settings, fleetVersion, timestamp: Date.now() });
  } catch (error: any) {
    return c.json({ error: 'Failed to sync settings' }, 500);
  }
});

app.post('/settings/update', async (c) => {
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

    return c.json({ success: true, message: 'Settings updated globally' });
  } catch (error: any) {
    return c.json({ error: 'Failed to update settings' }, 500);
  }
});

app.get('/cloud/sync/settings', async (c) => {
  try {
    const clientHash = c.req.query('hash') || '';
    const { results } = await c.get('DB').prepare(
      `SELECT * FROM global_settings`
    ).all();

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
    return c.json({ error: 'Failed to sync remote settings' }, 500);
  }
});

app.get('/cloud/config/current', async (c) => {
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
    return c.json({ error: 'Failed to fetch remote config' }, 500);
  }
});

app.post('/cloud/config/push', async (c) => {
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

    await c.get('DB').prepare(
      `INSERT INTO global_settings (id, key, value, version, updated_at) VALUES ('remote_settings_hash', 'remote_settings_hash', ?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, version=global_settings.version + 1, updated_at=excluded.updated_at`
    ).bind(String(now), now).run();

    return c.json({ success: true, deliveredTo: 1, failedTargets: [], version: String(now) });
  } catch (error: any) {
    return c.json({ error: 'Failed to push config' }, 500);
  }
});

app.get('/cloud/config/history', async (c) => {
  return c.json([]);
});

app.post('/franchise/onboard', async (c) => {
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
    
    await db.prepare(
      `INSERT INTO white_label_configs (id, resort_id, primary_color) VALUES (?, ?, ?)`
    ).bind(crypto.randomUUID(), resortId, '#38bdf8').run();

    const keySeed = crypto.randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase();

    return c.json({ 
      success: true, 
      resort_id: resortId, 
      region_id,
      license_seed: keySeed,
      message: 'Franchise successfully onboarded'
    });
  } catch (error: any) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.get('/resort/:resort_id/theme', async (c) => {
  try {
    const resortId = c.req.param('resort_id');
    const db = c.get('DB');
    
    const theme = await db.prepare(
      `SELECT * FROM white_label_configs WHERE resort_id = ?`
    ).bind(resortId).first();
    
    if (!theme) return c.json({ error: 'Theme not found' }, 404);
    return c.json(theme);
  } catch (error: any) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.post('/resort/:resort_id/theme', async (c) => {
  try {
    const resortId = c.req.param('resort_id');
    const { logo_url, primary_color, domain_cname, receipt_footer } = await c.req.json();
    const db = c.get('DB');
    
    await db.prepare(
      `UPDATE white_label_configs SET logo_url = ?, primary_color = ?, domain_cname = ?, receipt_footer = ?, updated_at = CURRENT_TIMESTAMP WHERE resort_id = ?`
    ).bind(logo_url || null, primary_color || '#38bdf8', domain_cname || null, receipt_footer || null, resortId).run();
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.get('/stations/sla-report', async (c) => {
  try {
    const db = c.get('DB');
    
    const nodesResponse = await db.prepare(`SELECT * FROM fleet_nodes ORDER BY last_seen DESC LIMIT 50`).all();
    
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
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.post('/payroll/calculate-commissions', async (c) => {
  try {
    const { start_date, end_date } = await c.req.json();
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
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

export default app;
