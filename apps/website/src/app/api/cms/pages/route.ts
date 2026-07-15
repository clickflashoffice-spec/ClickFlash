import { logger } from '@clickflash/logger';
import { NextResponse } from 'next/server';
import { pagesStore } from '@/lib/cmsStore';

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s+on[a-z]+=(["'])(.*?)\1/gi, '')
    .replace(/javascript:/gi, '');
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as any;
    const { data } = body;
    
    if (!data || !data.slug || !data.content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sanitizedContent = sanitizeHtml(data.content);

    const page = {
      title: data.title,
      slug: data.slug,
      content: sanitizedContent,
      status: data.status || 'published',
      createdAt: new Date().toISOString()
    };

    pagesStore.set(data.slug, page);

    return NextResponse.json({ success: true, page }, { status: 201 });
  } catch (error) {
    logger.error('Error creating page:', error as Error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  
  if (slug) {
    const page = pagesStore.get(slug);
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    return NextResponse.json({ page }, { status: 200 });
  }
  
  const pages = Array.from(pagesStore.values());
  return NextResponse.json({ pages }, { status: 200 });
}
