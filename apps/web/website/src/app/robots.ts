import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://clickflash.com';

    return {
        rules: [
            {
                userAgent: '*',
                allow: ['/', '/clients'],
                disallow: [
                    '/api/',
                    '/clients/*',
                    '/_next/',
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
