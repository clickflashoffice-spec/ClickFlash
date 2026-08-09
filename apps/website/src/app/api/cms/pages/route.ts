import { logger } from '@clickflash/logger';
import { NextResponse } from 'next/server';
import { pagesStore } from '@/lib/cmsStore';


function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s+on[a-z]+=(["'])(.*?)\1/gi, '')
    .replace(/javascript:/gi, '');
}

export const dynamic = 'force-static';

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
