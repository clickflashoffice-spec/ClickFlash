import { notFound } from 'next/navigation';
import { pagesStore } from '@/lib/cmsStore';

export default async function CMSPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  // Try to find the page in our in-memory store
  const page = pagesStore.get(slug);
  
  if (!page || page.status !== 'published') {
    notFound();
  }

  return (
    <main className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">{page.title}</h1>
      <div 
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: page.content }} 
      />
    </main>
  );
}
