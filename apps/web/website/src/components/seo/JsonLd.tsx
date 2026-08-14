/**
 * JSON-LD Structured Data Components for SEO
 * 
 * Provides rich search results through Schema.org structured data.
 * Supports Organization, LocalBusiness, Service, FAQ, and Article schemas.
 */

import { ReactNode } from "react";

// Base schema interface
interface SchemaBase {
  "@context": "https://schema.org";
  "@type": string;
}

// Organization Schema
export interface OrganizationSchema extends SchemaBase {
  "@type": "Organization";
  name: string;
  url: string;
  logo: string;
  description: string;
  sameAs: string[];
  contactPoint: {
    "@type": "ContactPoint";
    telephone: string;
    contactType: string;
    areaServed: string;
    availableLanguage: string[];
  };
  address?: {
    "@type": "PostalAddress";
    addressCountry: string;
  };
}

// Local Business Schema
export interface LocalBusinessSchema extends SchemaBase {
  "@type": "LocalBusiness" | "ProfessionalService";
  "@id": string;
  name: string;
  image: string;
  url: string;
  telephone: string;
  email?: string;
  address: {
    "@type": "PostalAddress";
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry: string;
  };
  geo?: {
    "@type": "GeoCoordinates";
    latitude: number;
    longitude: number;
  };
  priceRange: string;
  openingHours: string;
  aggregateRating?: {
    "@type": "AggregateRating";
    ratingValue: number;
    reviewCount: number;
  };
}

// Service Schema
export interface ServiceSchema extends SchemaBase {
  "@type": "Service";
  name: string;
  description: string;
  provider: {
    "@type": "Organization";
    name: string;
    url: string;
  };
  areaServed: string | {
    "@type": string;
    name: string;
  };
  serviceType: string;
  offers?: {
    "@type": "Offer";
    price: string;
    priceCurrency: string;
  };
}

// FAQ Schema
export interface FAQSchema extends SchemaBase {
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: {
      "@type": "Answer";
      text: string;
    };
  }>;
}

// Article/Blog Post Schema
export interface ArticleSchema extends SchemaBase {
  "@type": "Article" | "BlogPosting";
  headline: string;
  description: string;
  image: string | string[];
  datePublished: string;
  dateModified?: string;
  author: {
    "@type": "Person" | "Organization";
    name: string;
    url?: string;
  };
  publisher: {
    "@type": "Organization";
    name: string;
    logo: {
      "@type": "ImageObject";
      url: string;
    };
  };
  mainEntityOfPage?: {
    "@type": "WebPage";
    "@id": string;
  };
}

// Breadcrumb Schema
export interface BreadcrumbSchema extends SchemaBase {
  "@type": "BreadcrumbList";
  itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item?: string;
  }>;
}

// WebSite Schema (for search box in results)
export interface WebSiteSchema extends SchemaBase {
  "@type": "WebSite";
  url: string;
  name: string;
  description: string;
  potentialAction?: {
    "@type": "SearchAction";
    target: {
      "@type": "EntryPoint";
      urlTemplate: string;
    };
    "query-input": string;
  };
}

// Union type for all schemas
export type Schema = 
  | OrganizationSchema 
  | LocalBusinessSchema 
  | ServiceSchema 
  | FAQSchema 
  | ArticleSchema
  | BreadcrumbSchema
  | WebSiteSchema;

// Pre-built schemas for ClickFlash

export const organizationSchema: OrganizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ClickFlash Photography",
  url: "https://clickflash.com",
  logo: "https://clickflash.com/logo.png",
  description: "Professional event and resort photography services with cinematic quality and offline-first technology.",
  sameAs: [
    "https://www.facebook.com/profile.php?id=100089262084542",
    "https://www.instagram.com/clicketflash/",
    "https://www.linkedin.com/company/102390621/"
  ],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+1-555-000-1234",
    contactType: "customer service",
    areaServed: "Worldwide",
    availableLanguage: ["English", "French", "Arabic", "German", "Spanish", "Greek"]
  },
  address: {
    "@type": "PostalAddress",
    addressCountry: "US"
  }
};

export const localBusinessSchema: LocalBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": "https://clickflash.com",
  name: "ClickFlash Photography",
  image: "https://clickflash.com/og-image.jpg",
  url: "https://clickflash.com",
  telephone: "+1-555-000-1234",
  email: "clickflash.office@gmail.com",
  address: {
    "@type": "PostalAddress",
    addressCountry: "US"
  },
  priceRange: "$$$",
  openingHours: "Mo-Su 08:00-22:00",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: 4.9,
    reviewCount: 2000
  }
};

export const photographyServiceSchema: ServiceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Professional Photography Services",
  description: "Wedding, event, resort, and portrait photography with instant delivery and on-site printing.",
  provider: {
    "@type": "Organization",
    name: "ClickFlash Photography",
    url: "https://clickflash.com"
  },
  areaServed: {
    "@type": "Place",
    name: "Worldwide"
  },
  serviceType: "Photography"
};

export const websiteSchema: WebSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  url: "https://clickflash.com",
  name: "ClickFlash Photography",
  description: "Professional event and resort photography services",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://clickflash.com/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
};

// Schema generators

export function generateServiceSchema(
  name: string,
  description: string,
  price?: string
): ServiceSchema {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    provider: {
      "@type": "Organization",
      name: "ClickFlash Photography",
      url: "https://clickflash.com"
    },
    areaServed: "Worldwide",
    serviceType: "Photography",
    ...(price && {
      offers: {
        "@type": "Offer",
        price,
        priceCurrency: "USD"
      }
    })
  };
}

export function generateFAQSchema(questions: Array<{ question: string; answer: string }>): FAQSchema {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer
      }
    }))
  };
}

export function generateArticleSchema(
  title: string,
  description: string,
  image: string,
  publishedAt: string,
  author: string,
  modifiedAt?: string
): ArticleSchema {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    image,
    datePublished: publishedAt,
    dateModified: modifiedAt || publishedAt,
    author: {
      "@type": "Person",
      name: author
    },
    publisher: {
      "@type": "Organization",
      name: "ClickFlash Photography",
      logo: {
        "@type": "ImageObject",
        url: "https://clickflash.com/logo.png"
      }
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": "https://clickflash.com/blog"
    }
  };
}

export function generateBreadcrumbSchema(
  items: Array<{ name: string; url?: string }>
): BreadcrumbSchema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.url && { item: item.url })
    }))
  };
}

// Component to inject JSON-LD into page
interface JsonLdProps {
  data: Schema | Schema[];
  children?: ReactNode;
}

export function JsonLd({ data, children }: JsonLdProps) {
  const schemas = Array.isArray(data) ? data : [data];
  
  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ 
            __html: JSON.stringify(schema, null, process.env.NODE_ENV === "development" ? 2 : 0) 
          }}
        />
      ))}
      {children}
    </>
  );
}

export default JsonLd;
