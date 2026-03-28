import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { JsonLd, organizationSchema } from "@/components/seo/JsonLd";
import { FloatingWhatsApp } from "@/components/ui/FloatingWhatsApp";
import { fetchWebsiteSettings } from "@/lib/settings";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { baseMetadata, viewport as siteViewport } from "./metadata";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
  preload: true,
});

// Export viewport configuration
export const viewport: Viewport = siteViewport;

// Export base metadata
export const metadata: Metadata = baseMetadata;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await fetchWebsiteSettings();

  return (
    <html lang="en" dir="ltr" className="light color-scheme-light scroll-smooth">
      <head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />

        {/* JSON-LD Structured Data */}
        <JsonLd data={organizationSchema} />

        {/* Theme Color for Mobile Browsers */}
        <meta name="theme-color" content="#06b6d4" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)" />
      </head>
      <body
        className={`${outfit.variable} ${cormorant.variable} min-h-screen bg-white text-slate-900 antialiased`}
      >
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-200 focus:rounded-lg focus:bg-cyan-500 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>

        <LanguageProvider>
          <div id="main-content" className="relative w-full" role="main">
            {children}
          </div>
          <Navbar />
          <Footer settings={settings} />
          <FloatingWhatsApp />
        </LanguageProvider>

        {/* Analytics Scripts - Load conditionally in production */}
        {process.env.NODE_ENV === "production" && (
          <>
            {/* Google Analytics 4 */}
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
                    page_title: document.title,
                    page_location: window.location.href,
                    send_page_view: true
                  });
                `,
              }}
            />
          </>
        )}
      </body>
    </html>
  );
}
