import { NextResponse } from 'next/server';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { pagesStore } from '@/lib/cmsStore';

export async function POST(request: Request) {
  try {
    const body = await request.json() as any;
    const { data } = body;
    
    if (!data || !data.slug || !data.content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Set up JSDOM for DOMPurify to work in Node environment
    const window = new JSDOM('').window;
    const purify = DOMPurify(window as any);
    
    // Sanitize the content to prevent XSS
    const sanitizedContent = purify.sanitize(data.content, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'br', 'span', 'div', 'img', 'blockquote'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'id', 'target']
    });

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
    console.error('Error creating page:', error);
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


