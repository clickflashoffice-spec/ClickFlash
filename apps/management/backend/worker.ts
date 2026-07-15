// apps/management/backend/worker.ts

import type { D1Database, R2Bucket, ExecutionContext } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  RESEND_API_KEY: string;
}

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

      return new Response(JSON.stringify({ error: 'Not Found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      });
    } catch (error) {
      console.error(error);
      return new Response(JSON.stringify({ error: (error as Error).message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
};
