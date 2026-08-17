import { Hono } from 'hono';
import { requireServiceAuth } from '../auth';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

// Currency PPP and Exchange Multipliers
const CURRENCY_CONFIG: Record<string, { symbol: string; rate: number; pppFactor: number }> = {
  USD: { symbol: '$', rate: 1.0, pppFactor: 1.0 },
  EUR: { symbol: '€', rate: 0.92, pppFactor: 0.95 },
  GBP: { symbol: '£', rate: 0.79, pppFactor: 0.90 },
  AED: { symbol: 'AED ', rate: 3.67, pppFactor: 1.10 },
  JPY: { symbol: '¥', rate: 155.0, pppFactor: 0.85 }
};

app.get('/packages', async (c) => {
  try {
    const db = c.get('DB');
    const tenantId = c.get('tenantId') || 'default-tenant';
    const targetCurrency = (c.req.query('currency') || 'USD').toUpperCase();
    const weatherParam = (c.req.query('weather') || 'clear').toLowerCase();
    const intensityParam = (c.req.query('thrill') || 'high').toLowerCase();

    const curr = CURRENCY_CONFIG[targetCurrency] || CURRENCY_CONFIG.USD;

    // Fetch tenant-scoped packages or fallback to global packs
    const { results } = await db.prepare(
      `SELECT * FROM packs WHERE tenant_id = ? OR tenant_id IS NULL`
    ).bind(tenantId).all();
    
    // Dynamic Yield Logic: Calculate recent session velocity
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const sessionCountRow = await db.prepare(
      `SELECT count(*) as count FROM sessions WHERE created_at > ? AND (tenant_id = ? OR tenant_id IS NULL)`
    ).bind(oneHourAgo, tenantId).first();
    
    const count = (sessionCountRow?.count as number) || 0;
    
    // Base density multiplier
    let densityMultiplier = 1.0;
    if (count > 100) densityMultiplier = 1.35; // Peak Surge
    else if (count > 50) densityMultiplier = 1.15; // High
    else if (count < 20) densityMultiplier = 0.90; // Low volume discount

    // Weather multiplier (Flash Rain discount to capture volume vs sunny surge)
    let weatherMultiplier = 1.15;
    if (weatherParam.includes('rain') || weatherParam.includes('storm')) {
      weatherMultiplier = 0.80; // Flash rain conversion
    } else if (weatherParam.includes('cloud')) {
      weatherMultiplier = 1.0;
    }

    // Ride thrill multiplier
    let thrillMultiplier = 1.0;
    if (intensityParam === 'high' || intensityParam === 'apex') {
      thrillMultiplier = 1.10;
    }

    const totalYieldMultiplier = Number((densityMultiplier * weatherMultiplier * thrillMultiplier).toFixed(3));

    const items = results.map((row: any) => {
      const baseUSD = Number(row.price || 19.99);
      const dynamicUSD = baseUSD * totalYieldMultiplier;
      const localizedPrice = Math.round((dynamicUSD * curr.rate * curr.pppFactor) * 100) / 100;
      
      return {
        id: row.id,
        tenantId,
        name: row.name,
        type: row.name.includes('Digital') ? 'Digital' : (row.name.includes('Print') ? 'Print' : 'Bundle'),
        price: localizedPrice,
        basePrice: Math.round((baseUSD * curr.rate * curr.pppFactor) * 100) / 100,
        currency: targetCurrency,
        currencySymbol: curr.symbol,
        yieldMultiplier: totalYieldMultiplier,
        active: true,
      };
    });

    // Provide default fallback packages if database has no active pack rows
    if (items.length === 0) {
      const defaultPacks = [
        { id: 'pack-single-dig', name: 'Single Digital Capture', base: 19.99, type: 'Digital' },
        { id: 'pack-all-inc-dig', name: 'All-Inclusive Digital Pass', base: 89.00, type: 'Digital' },
        { id: 'pack-vip-bundle', name: 'VIP Digital + 3 Acrylic Prints', base: 129.00, type: 'Bundle' },
        { id: 'pack-resort-album', name: 'Premium Hardcover Album', base: 249.00, type: 'Print' }
      ];

      for (const p of defaultPacks) {
        const dynamicUSD = p.base * totalYieldMultiplier;
        const localizedPrice = Math.round((dynamicUSD * curr.rate * curr.pppFactor) * 100) / 100;
        items.push({
          id: p.id,
          tenantId,
          name: p.name,
          type: p.type,
          price: localizedPrice,
          basePrice: Math.round((p.base * curr.rate * curr.pppFactor) * 100) / 100,
          currency: targetCurrency,
          currencySymbol: curr.symbol,
          yieldMultiplier: totalYieldMultiplier,
          active: true,
        });
      }
    }

    return c.json({
      success: true,
      tenantId,
      currency: targetCurrency,
      telemetry: {
        sessionVelocityLastHour: count,
        densityMultiplier,
        weatherMultiplier,
        thrillMultiplier,
        totalYieldMultiplier
      },
      items
    });
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch packages', message: error.message }, 500);
  }
});

export default app;
