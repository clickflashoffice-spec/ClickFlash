import { logger } from '@clickflash/logger';
import type { MetadataRoute } from "next";
import { fetchPortfolioItems } from "@/lib/settings";

// Base URL configuration
const baseUrl = "https://clickflash.com";

// Static pages configuration with SEO priorities
const staticPages = [
  { url: "/", changeFreq: "weekly", priority: 1.0 },
  { url: "/about", changeFreq: "monthly", priority: 0.8 },
  { url: "/services", changeFreq: "monthly", priority: 0.9 },
  { url: "/portfolio", changeFreq: "weekly", priority: 0.9 },
  { url: "/pricing", changeFreq: "monthly", priority: 0.9 },
  { url: "/bookings", changeFreq: "monthly", priority: 0.9 },
  { url: "/testimonials", changeFreq: "weekly", priority: 0.7 },
  { url: "/blog", changeFreq: "daily", priority: 0.8 },
  { url: "/faq", changeFreq: "monthly", priority: 0.6 },
  { url: "/contact", changeFreq: "monthly", priority: 0.7 },
  { url: "/careers", changeFreq: "weekly", priority: 0.6 },
  { url: "/clients", changeFreq: "monthly", priority: 0.5 },
  { url: "/privacy", changeFreq: "yearly", priority: 0.3 },
  { url: "/terms", changeFreq: "yearly", priority: 0.3 },
] as const;

// Blog posts data - in production, fetch from CMS/API
const blogPosts = [
  {
    slug: "unlock-5-secrets-capturing-stunning-vacation-photos",
    lastModified: "2026-01-15",
  },
  {
    slug: "professional-photo-session-locations",
    lastModified: "2026-01-10",
  },
  {
    slug: "evolution-photography-history-modern-trends",
    lastModified: "2025-12-28",
  },
  {
    slug: "hire-best-event-photographer-hotel-water-park",
    lastModified: "2025-12-20",
  },
  {
    slug: "why-you-need-wedding-album-beyond-usb",
    lastModified: "2025-12-15",
  },
  {
    slug: "black-white-photography-timeless-comeback",
    lastModified: "2025-12-10",
  },
  {
    slug: "capture-best-wedding-photos-tips",
    lastModified: "2025-12-05",
  },
];

// Service pages
const servicePages = [
  { slug: "luxury-resorts", changeFreq: "monthly" as const },
  { slug: "weddings", changeFreq: "monthly" as const },
  { slug: "corporate-events", changeFreq: "monthly" as const },
  { slug: "family-portraits", changeFreq: "monthly" as const },
  { slug: "water-parks", changeFreq: "monthly" as const },
  { slug: "attractions", changeFreq: "monthly" as const },
];

/**
 * Generate sitemap entries for static pages
 */
function getStaticPages(): MetadataRoute.Sitemap {
  const now = new Date();

  return staticPages.map((page) => ({
    url: `${baseUrl}${page.url}`,
    lastModified: now,
    changeFrequency: page.changeFreq,
    priority: page.priority,
  }));
}

/**
 * Generate sitemap entries for blog posts
 */
function getBlogPosts(): MetadataRoute.Sitemap {
  return blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.lastModified),
    changeFrequency: "monthly",
    priority: 0.6,
  }));
}

/**
 * Generate sitemap entries for service pages
 */
function getServicePages(): MetadataRoute.Sitemap {
  return servicePages.map((service) => ({
    url: `${baseUrl}/services/${service.slug}`,
    lastModified: new Date(),
    changeFrequency: service.changeFreq,
    priority: 0.8,
  }));
}

/**
 * Generate sitemap entries for portfolio items
 * Fetches from API in production
 */
async function getPortfolioItems(): Promise<MetadataRoute.Sitemap> {
  try {
    const items = await fetchPortfolioItems();
    
    return items.map((item) => ({
      url: `${baseUrl}/portfolio/${item.id}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch (error) {
    logger.warn("Failed to fetch portfolio items for sitemap:", error instanceof Error ? { error: error.message } : undefined);
    return [];
  }
}

/**
 * Generate alternate language URLs for a given path
 * Implements hreflang for international SEO
 */
export function getAlternateLanguages(path: string): Record<string, string> {
  const languages = ["en", "fr", "de", "es", "ar", "gr"];
  const alternates: Record<string, string> = {};

  languages.forEach((lang) => {
    alternates[lang] = `${baseUrl}/${lang}${path}`;
  });

  // Add x-default for language detection
  alternates["x-default"] = `${baseUrl}${path}`;

  return alternates;
}

/**
 * Generate image sitemap entries for gallery/SEO
 */
function getImageSitemap(): MetadataRoute.Sitemap {
  // Key portfolio images for image SEO
  const keyImages = [
    {
      url: `${baseUrl}/portfolio`,
      images: [
        `${baseUrl}/portfolio/hero-wedding.jpg`,
        `${baseUrl}/portfolio/hero-resort.jpg`,
        `${baseUrl}/portfolio/hero-event.jpg`,
      ],
    },
  ];

  // Note: Next.js sitemap.ts doesn't support image sitemap directly
  // For full image sitemap support, use a separate XML route
  return [];
}

/**
 * Main sitemap generation function
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = getStaticPages();
  const blogEntries = getBlogPosts();
  const serviceEntries = getServicePages();
  const portfolioEntries = await getPortfolioItems();

  // Combine all entries
  const allEntries: MetadataRoute.Sitemap = [
    ...staticEntries,
    ...blogEntries,
    ...serviceEntries,
    ...portfolioEntries,
  ];

  // Sort by priority (highest first)
  return allEntries.sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

// Revalidate every hour
export const revalidate = 3600;
