/**
 * Centralized Metadata Configuration for ClickFlash Website
 * 
 * This file contains all metadata configurations following Next.js 15 best practices
 * for SEO, OpenGraph, Twitter Cards, and structured metadata.
 */

import type { Metadata, Viewport } from "next";

// Brand Constants
export const BRAND = {
  name: "ClickFlash Photography",
  shortName: "ClickFlash",
  tagline: "Professional Event & Resort Photography",
  description: "Premium event and resort photography services. Professional, offline-first photography with cinematic quality. Capture life's most precious moments with ClickFlash.",
  url: "https://clickflash.com",
  logo: "/logo.png",
  ogImage: "/og-image.jpg",
  foundingDate: "2008",
  email: "clickflash.office@gmail.com",
  phone: "+1-555-000-1234",
  social: {
    facebook: "https://www.facebook.com/profile.php?id=100089262084542",
    instagram: "https://www.instagram.com/clicketflash/",
    linkedin: "https://www.linkedin.com/company/102390621/",
  },
  languages: ["en", "fr", "de", "es", "ar", "gr"],
  defaultLanguage: "en",
} as const;

// Viewport Configuration
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

// Base Metadata
export const baseMetadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  applicationName: BRAND.shortName,
  authors: [{ name: BRAND.name, url: BRAND.url }],
  generator: "Next.js 15",
  referrer: "origin-when-cross-origin",
  keywords: [
    "photography",
    "event photography",
    "resort photography",
    "wedding photography",
    "professional photography",
    "photo gallery",
    "destination photography",
    "luxury photography",
    "corporate photography",
    "family portraits",
  ],
  creator: BRAND.name,
  publisher: BRAND.name,
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

// OpenGraph Template
export const openGraphTemplate = {
  type: "website" as const,
  locale: "en_US",
  alternateLocale: ["fr_FR", "de_DE", "es_ES", "ar_SA", "el_GR"],
  siteName: BRAND.name,
  images: [
    {
      url: BRAND.ogImage,
      width: 1200,
      height: 630,
      alt: `${BRAND.name} - ${BRAND.tagline}`,
      type: "image/jpeg",
    },
  ],
};

// Twitter Template
export const twitterTemplate = {
  card: "summary_large_image" as const,
  site: "@clickflash",
  creator: "@clickflash",
  images: [BRAND.ogImage],
};

// Page-specific metadata helpers
export function createPageMetadata({
  title,
  description,
  path,
  images,
  type = "website",
}: {
  title: string;
  description?: string;
  path: string;
  images?: NonNullable<Metadata["openGraph"]>["images"];
  type?: "website" | "article" | "profile";
}): Metadata {
  const url = `${BRAND.url}${path}`;
  const desc = description || BRAND.description;

  return {
    title: {
      default: `${title} | ${BRAND.shortName}`,
      template: `%s | ${BRAND.shortName}`,
    },
    description: desc,
    alternates: {
      canonical: url,
      languages: {
        "en": `${BRAND.url}/en${path}`,
        "fr": `${BRAND.url}/fr${path}`,
        "de": `${BRAND.url}/de${path}`,
        "es": `${BRAND.url}/es${path}`,
        "ar": `${BRAND.url}/ar${path}`,
        "el": `${BRAND.url}/gr${path}`,
      },
    },
    openGraph: {
      ...openGraphTemplate,
      type,
      url,
      title: `${title} | ${BRAND.name}`,
      description: desc,
      images: images || openGraphTemplate.images,
    },
    twitter: {
      ...twitterTemplate,
      title: `${title} | ${BRAND.name}`,
      description: desc,
      images: images && Array.isArray(images) ? images : twitterTemplate.images,
    },
  };
}

// Static Pages Metadata
export const staticPagesMetadata: Record<string, Metadata> = {
  home: {
    title: {
      default: `${BRAND.name} | ${BRAND.tagline}`,
      template: `%s | ${BRAND.shortName}`,
    },
    description: BRAND.description,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      ...openGraphTemplate,
      url: BRAND.url,
      title: `${BRAND.name} | ${BRAND.tagline}`,
      description: BRAND.description,
    },
    twitter: {
      ...twitterTemplate,
      title: `${BRAND.name} | ${BRAND.tagline}`,
      description: BRAND.description,
    },
  },
  about: createPageMetadata({
    title: "About Us",
    description: "Learn about ClickFlash Photography - our story, our team, and our passion for capturing unforgettable moments since 2008.",
    path: "/about",
  }),
  services: createPageMetadata({
    title: "Our Services",
    description: "Discover our professional photography services: luxury resort photography, wedding photography, corporate events, family portraits, and more.",
    path: "/services",
  }),
  portfolio: createPageMetadata({
    title: "Portfolio",
    description: "Explore our stunning photography portfolio showcasing events, resorts, weddings, and portraits from around the world.",
    path: "/portfolio",
  }),
  pricing: createPageMetadata({
    title: "Pricing",
    description: "Transparent pricing for professional photography services. Custom packages available for events, resorts, and weddings.",
    path: "/pricing",
  }),
  bookings: createPageMetadata({
    title: "Book a Photoshoot",
    description: "Book your professional photography session. Easy online booking for events, portraits, and special occasions.",
    path: "/bookings",
  }),
  testimonials: createPageMetadata({
    title: "Testimonials",
    description: "Read what our clients say about their experience with ClickFlash Photography. Real reviews from real customers.",
    path: "/testimonials",
  }),
  blog: createPageMetadata({
    title: "Blog",
    description: "Photography tips, behind-the-scenes stories, and inspiration for your next photoshoot. Expert advice from our professional photographers.",
    path: "/blog",
  }),
  faq: createPageMetadata({
    title: "FAQ",
    description: "Find answers to frequently asked questions about our photography services, booking process, and delivery options.",
    path: "/faq",
  }),
  contact: createPageMetadata({
    title: "Contact Us",
    description: "Get in touch with ClickFlash Photography. Book a session, ask questions, or collaborate with our team.",
    path: "/contact",
  }),
  careers: createPageMetadata({
    title: "Careers",
    description: "Join the ClickFlash team. Explore career opportunities in photography, editing, and hospitality management.",
    path: "/careers",
  }),
  clients: createPageMetadata({
    title: "Our Clients",
    description: "Trusted by leading resorts, hotels, and event venues worldwide. Discover our client partnerships.",
    path: "/clients",
  }),
  privacy: createPageMetadata({
    title: "Privacy Policy",
    description: "ClickFlash Photography privacy policy. Learn how we protect your personal information and photos.",
    path: "/privacy",
  }),
  terms: createPageMetadata({
    title: "Terms of Service",
    description: "Terms and conditions for using ClickFlash Photography services. Read our service agreement and policies.",
    path: "/terms",
  }),
};

// Article/Blog Post Metadata Helper
export function createBlogPostMetadata({
  title,
  description,
  slug,
  publishedAt,
  modifiedAt,
  author,
  coverImage,
  tags,
}: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  modifiedAt?: string;
  author?: string;
  coverImage?: string;
  tags?: string[];
}): Metadata {
  const url = `${BRAND.url}/blog/${slug}`;
  const imageUrl = coverImage || BRAND.ogImage;

  return {
    title: `${title} | ${BRAND.shortName} Blog`,
    description,
    authors: [{ name: author || BRAND.name }],
    alternates: {
      canonical: url,
    },
    openGraph: {
      ...openGraphTemplate,
      type: "article",
      url,
      title: `${title} | ${BRAND.name} Blog`,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
          type: "image/jpeg",
        },
      ],
      publishedTime: publishedAt,
      modifiedTime: modifiedAt,
      authors: [author || BRAND.name],
      tags,
    },
    twitter: {
      ...twitterTemplate,
      title: `${title} | ${BRAND.name} Blog`,
      description,
      images: [imageUrl],
    },
  };
}

// Service Page Metadata Helper
export function createServiceMetadata({
  title,
  description,
  slug,
  image,
}: {
  title: string;
  description: string;
  slug: string;
  image?: string;
}): Metadata {
  return createPageMetadata({
    title: `${title} Photography`,
    description,
    path: `/services/${slug}`,
    images: image ? [{ url: image, width: 1200, height: 630, alt: title }] : undefined,
  });
}

// Manifest for PWA
export const siteManifest = {
  name: BRAND.name,
  short_name: BRAND.shortName,
  description: BRAND.description,
  start_url: "/",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#06b6d4",
  icons: [
    { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
  ],
};

export default baseMetadata;
