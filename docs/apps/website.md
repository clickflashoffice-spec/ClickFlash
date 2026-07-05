# Forensic Architecture Report: `apps/website/` — Marketing Website

> Generated: 2026-06-22 | Scope: Next.js 15 static export, Cloudflare Pages, Tailwind, GSAP/Framer Motion

## 1. Overview & Stats

| Attribute | Value |
|-----------|-------|
| **App name** | `main-website` |
| **Version** | 4.2.0 |
| **Frontend stack** | Next.js 15.1.7, React 19.2, TypeScript 5.9, Tailwind CSS 3.4, GSAP, Framer Motion |
| **Deployment target** | Static export -> Cloudflare Pages (`@cloudflare/next-on-pages`) |
| **Package manager** | pnpm 10.28.2 |
| **TS/TSX files** | 75 |
| **Component files** | 27 |
| **Page files** | 15 (App Router) |
| **Test files** | 8 |
| **Key dependencies** | `next`, `framer-motion`, `gsap`, `lucide-react`, `clsx`, `tailwind-merge`, `@builder.io/partytown` |

**Entry flow**: `src/app/layout.tsx` -> `src/app/page.tsx` -> `HomePageContent`. Root layout fetches `WebsiteSettings` from the Gallery/Cloud API settings collection, passes to `Footer`. Static export (`output: "export"`) pre-renders all pages at build time; ISR revalidate is declared but static export ignores it.

## 2. Folder/File Tree

```
apps/website/
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout, fonts, GA, JSON-LD
│   │   ├── page.tsx              # Home wrapper
│   │   ├── HomePageContent.tsx   # Home sections
│   │   ├── metadata.ts           # SEO/OG metadata factory
│   │   ├── globals.css
│   │   ├── about/page.tsx
│   │   ├── services/page.tsx
│   │   ├── portfolio/page.tsx
│   │   ├── pricing/page.tsx
│   │   ├── bookings/page.tsx
│   │   ├── testimonials/page.tsx
│   │   ├── blog/page.tsx
│   │   ├── blog/[slug]/page.tsx
│   │   ├── faq/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── careers/page.tsx
│   │   ├── clients/page.tsx
│   │   ├── privacy/page.tsx
│   │   ├── terms/page.tsx
│   │   ├── sitemap.ts
│   │   └── robots.ts
│   ├── components/
│   │   ├── layout/               # Navbar, Footer, TopBar
│   │   ├── sections/             # Hero, Stats, Reviews, Portfolio, etc.
│   │   ├── ui/                   # Button, Logo, FloatingWhatsApp, etc.
│   │   ├── seo/JsonLd.tsx
│   │   └── ErrorBoundary.tsx
│   ├── contexts/LanguageContext.tsx
│   ├── lib/
│   │   ├── settings.ts           # fetchWebsiteSettings, fetchPortfolioItems
│   │   └── utils.ts
│   └── middleware/security.ts    # CSP/security header helper (NOT wired as Next.js middleware)
├── public/
├── __tests__/smoke.test.tsx
├── e2e/*.spec.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

## 3. Screens / Pages / Routes

### App Router pages
- `/` — Home
- `/about`, `/services`, `/portfolio`, `/pricing`
- `/bookings`, `/testimonials`, `/faq`, `/contact`
- `/blog`, `/blog/[slug]`
- `/careers`, `/clients`
- `/privacy`, `/terms`
- `/sitemap.xml`, `/robots.txt`

### Data sources
- Settings fetched from `${NEXT_PUBLIC_GALLERY_API_URL}/api/collections/settings/records`
- Portfolio fetched from `${NEXT_PUBLIC_GALLERY_API_URL}/api/collections/portfolio/records`
- Remote images from `images.unsplash.com`, `assets.clickflash.pro`, `res.cloudinary.com`

## 4. UI Component Inventory

### Layout
`Navbar`, `Footer`, `TopBar`.

### Sections
`Hero`, `StatsSection`, `ValuePropSection`, `EcosystemSection`, `PortfolioPreview`, `CustomerReviews`, `ReviewsSection`, `GoogleReviews`, `CustomReviewList`, `InstagramFeed`, `InstagramGrid`, `ContactSection`, `BookingSection`, `FleetStatus`.

### UI primitives
`Button`, `Logo`, `GlassPanel`, `ReviewCard`, `SectionHeader`, `FloatingWhatsApp`, `YouTubeEmbed`, `SrOnly`.

### SEO
`JsonLd`, `organizationSchema`.

### Error / accessibility
`ErrorBoundary`, skip-to-content link in layout.

### States
- Loading: static export means HTML is ready; client animations via Framer Motion
- Empty: fallback defaults in `HomePageContent`
- Error: `ErrorBoundary`

## 5. Features & User Journeys

1. **Marketing funnel**: home -> services -> portfolio -> pricing -> bookings
2. **Social proof**: reviews (Google/live/widget), Instagram feed, client logos, stats
3. **Lead capture**: contact form, WhatsApp float, booking form
4. **Content marketing**: blog with `[slug]` dynamic route
5. **Multi-language readiness**: `LanguageProvider` context (6 languages declared but i18n routing not implemented)

### Sub-features
- Static export for CDN hosting
- JSON-LD structured data
- SEO metadata per page via `createPageMetadata`
- Image remote patterns configured
- Partytown integration in devDependencies (not visibly used)

## 6. State Management

| Layer | Tech | Usage |
|-------|------|-------|
| Server data | Next.js `fetch` + `revalidate` | Settings, portfolio |
| UI animation | Framer Motion / GSAP | Scroll reveals, hero effects |
| Language | React Context | `LanguageProvider` |
| Global client | none | No Zustand/Redux |

## 7. API / Backend

**No dedicated backend**. The website is a static Next.js export.

**External data**:
- Gallery/Cloud API settings collection
- Gallery/Cloud API portfolio collection
- Google Analytics 4 (production only)

**Build-time env**: `NEXT_PUBLIC_GALLERY_API_URL`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.

## 8. Database

None directly. Reads from the shared gallery/management backend's `settings` and `portfolio` collections via REST.

## 9. Security Surface

| Area | Status | Notes |
|------|--------|-------|
| CSP helper | exists but **not wired** | `src/middleware/security.ts` exports middleware; no `middleware.ts` file registers it |
| Static export | no server-side middleware | `output: "export"` means middleware is not applied even if registered |
| Security headers | missing | no HSTS/X-Frame-Options/X-Content-Type-Options at edge unless added by Cloudflare Pages |
| XSS | relies on React | no explicit CSP in exported HTML |
| External scripts | GA4 inline script | uses `dangerouslySetInnerHTML` with build-time env only |
| Images | remotePatterns whitelist | allows `images.unsplash.com`, `assets.clickflash.pro`, `res.cloudinary.com` |
| Form submissions | contact/booking forms | likely submit to external endpoint; needs validation audit |
| Secrets | build-time env only | good; no runtime secrets |

## 10. Testing

- `__tests__/smoke.test.tsx` — React smoke test
- `e2e/*.spec.ts` — 7 Playwright specs (a11y, forms, home, homepage, navigation, visual, website)
- Vitest + Playwright + `@axe-core/playwright`

### Observed gaps
- No unit tests for settings/portfolio fetch
- No visual regression baseline in repo
- No CSP/security header assertions
- No form validation tests

## 11. Architecture / Performance / Design System

- **Static export**: fastest possible load times; no server runtime; all pages are HTML.
- **Image optimization**: `unoptimized: true` because static export cannot use Next.js image optimization API; relies on source image dimensions and CDN.
- **Animation**: mix of Framer Motion and GSAP; may impact INP on low-end devices.
- **Design system**: Tailwind; custom font variables; cyan/slate brand palette; glassmorphism panels.
- **i18n**: `LanguageProvider` context present but no route-based internationalization; metadata declares 6 locales but no `/[lang]` segment.
- **Bundle risks**: GSAP + Framer Motion together; `lucide-react` full import.

## 12. Concrete Improvement Proposals

1. **Wire or replace middleware**: add a root `middleware.ts` that re-exports `securityMiddleware`, or configure Cloudflare Pages `_headers`/`_routes.json` for HSTS/CSP.
2. **Move to non-static deployment** if middleware/dynamic ISR needed; otherwise use Cloudflare `_headers` for security headers.
3. **Implement i18n routing** (`/en`, `/fr`, etc.) or remove unused language metadata.
4. **Add Zod validation** to contact/booking forms and a honeypot field.
5. **Lazy-load GSAP/Framer Motion** below the fold to improve INP/LCP.
6. **Add unit tests** for `fetchWebsiteSettings` and `fetchPortfolioItems` using MSW.
7. **Add security header assertions** in Playwright to ensure HSTS/CSP at deploy time.
8. **Reduce image reliance on Unsplash** by moving assets to `assets.clickflash.pro` or R2 with signed URLs.
