// apps/management/backend/worker.ts

import type { D1Database, R2Bucket, ExecutionContext } from '@cloudflare/workers-types';
import { logger } from '@/utils/logger';

// Lightweight structured logger for Cloudflare Workers (no Node.js APIs available)
const workerLogger = {
  info: (msg: string, meta?: unknown) => logger.info(JSON.stringify({ level: 'info', service: 'management-worker', message: msg, meta, ts: new Date().toISOString() })),
  warn: (msg: string, meta?: unknown) => logger.warn(JSON.stringify({ level: 'warn', service: 'management-worker', message: msg, meta, ts: new Date().toISOString() })),
  error: (msg: string, meta?: unknown) => logger.error(JSON.stringify({ level: 'error', service: 'management-worker', message: msg, meta, ts: new Date().toISOString() })),
};

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  RESEND_API_KEY: string;
  SESSIONS_KV: KVNamespace;
}

// 1 minute sliding window rate limit
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 100;

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    try {
      // CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      // KV Rate Limiting Check
      const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
      if (clientIp !== 'unknown') {
        const currentMinute = Math.floor(Date.now() / 60000);
        const rateLimitKey = `rate_limit:${clientIp}:${currentMinute}`;
        
        const currentCountStr = await env.SESSIONS_KV.get(rateLimitKey);
        const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
        
        if (currentCount >= MAX_REQUESTS_PER_WINDOW) {
          workerLogger.warn(`Rate limit exceeded for IP: ${clientIp}`);
          return new Response(JSON.stringify({ error: 'Too Many Requests' }), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60',
              ...corsHeaders
            }
          });
        }
        
        ctx.waitUntil(
          env.SESSIONS_KV.put(rateLimitKey, (currentCount + 1).toString(), { expirationTtl: 60 * 5 }) // expire in 5m
        );
      }

      // KV Session Validation Check (for protected routes)
      const authHeader = request.headers.get('Authorization');
      if (url.pathname.startsWith('/api/') && url.pathname !== '/api/health') {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return new Response(JSON.stringify({ error: 'Unauthorized: Missing token' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        
        const token = authHeader.split(' ')[1];
        const sessionData = await env.SESSIONS_KV.get(`session:${token}`);
        
        if (!sessionData) {
          return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or expired session' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        
        // Refresh session expiration passively
        ctx.waitUntil(
          env.SESSIONS_KV.put(`session:${token}`, sessionData, { expirationTtl: 24 * 60 * 60 }) // 24 hours
        );
      }

      if (url.pathname === '/api/health') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      if (url.pathname === '/api/gallery/upload' && request.method === 'POST') {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
          return new Response(JSON.stringify({ error: 'No file provided' }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        const objectName = `uploads/${Date.now()}-${file.name}`;
        await env.BUCKET.put(objectName, file.stream() as any, {
          httpMetadata: { contentType: file.type },
        });

        // Ensure table exists (in a real app, use migrations)
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            type TEXT NOT NULL,
            size INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run();

        const stmt = env.DB.prepare('INSERT INTO files (name, path, type, size) VALUES (?, ?, ?, ?)')
          .bind(file.name, objectName, file.type, file.size);
        
        await stmt.run();

        return new Response(JSON.stringify({ success: true, path: objectName }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      if (url.pathname === '/api/gallery/files' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM files ORDER BY created_at DESC').all();
        return new Response(JSON.stringify({ files: results }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      if (url.pathname === '/api/email/send' && request.method === 'POST') {
        try {
          const body = await request.json() as any;
          const { to, subject, html, fromOverride } = body;

          if (!to || !subject || !html) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
              status: 400, 
              headers: { 'Content-Type': 'application/json', ...corsHeaders } 
            });
          }

          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: fromOverride || 'ClickFlash <hello@clickflash.app>',
              to: Array.isArray(to) ? to : [to],
              subject,
              html
            })
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(JSON.stringify(data));
          }

          return new Response(JSON.stringify({ success: true, data }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          });
        }
      }

      // WebAuthn Passkeys Routes
      if (url.pathname === '/api/auth/webauthn/generate-registration-options' && request.method === 'POST') {
        const { generateRegistrationOptions } = await import('@simplewebauthn/server');
        const body = await request.json() as any;
        const userId = body.userId || 'demo_user';
        
        const options = await generateRegistrationOptions({
          rpName: 'ClickFlash',
          rpID: new URL(request.url).hostname,
          userID: new TextEncoder().encode(userId),
          userName: userId,
          attestationType: 'none',
          authenticatorSelection: {
            residentKey: 'required',
            userVerification: 'preferred',
          },
        });
        
        // Save challenge in KV (10 minutes)
        await env.SESSIONS_KV.put(`webauthn_challenge:${userId}`, options.challenge, { expirationTtl: 600 });

        return new Response(JSON.stringify(options), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }

      if (url.pathname === '/api/auth/webauthn/verify-registration' && request.method === 'POST') {
        const { verifyRegistrationResponse } = await import('@simplewebauthn/server');
        const body = await request.json() as any;
        const { userId, response } = body;
        
        const expectedChallenge = await env.SESSIONS_KV.get(`webauthn_challenge:${userId}`);
        if (!expectedChallenge) return new Response(JSON.stringify({ error: 'Challenge expired or invalid' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

        try {
          const verification = await verifyRegistrationResponse({
            response,
            expectedChallenge,
            expectedOrigin: new URL(request.url).origin,
            expectedRPID: new URL(request.url).hostname,
          });

          if (verification.verified) {
             // In a real app, save verification.registrationInfo into DB
             await env.SESSIONS_KV.delete(`webauthn_challenge:${userId}`);
             return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
          }
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }
      }

      return new Response(JSON.stringify({ error: 'Not Found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      });
    } catch (error) {
      workerLogger.error('Unhandled worker error', { error: (error as Error).message, stack: (error as Error).stack });
      return new Response(JSON.stringify({ error: (error as Error).message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
};
