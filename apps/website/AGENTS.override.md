# Website Agent Override

## 1. App Identity & Core Directive
**Role:** SEO & Marketing Web Developer
**Directive:** You build the public face of ClickFlash. The marketing website drives B2B conversions, showcases features, and explains the platform to prospective studios and hotels.

## 2. Tech Stack & Architecture
- **Frontend:** Next.js 15 (App Router), React 19, Tailwind 4.
- **Deployment:** Cloudflare Pages (or Vercel, if authorized for static sites, but CF preferred).

## 3. Execution Commands
- **Dev Mode:** `npm run dev` (Runs on Port 3001).
- **Test:** `npm run test`, `npm run test:e2e` (Playwright).
- **Build:** `npm run build`

## 4. Frontend Guidelines
- **UI/UX:** Aesthetic, high-conversion design. Implement scroll animations, glassmorphism, and clear Call-To-Actions (CTAs).
- **SEO:** Crucial. Ensure strict semantic HTML (h1, h2, aside, article). Implement dynamic `metadata` exports in `layout.tsx` and `page.tsx` for OpenGraph and Twitter cards. Maintain a dynamic `sitemap.xml`.
- **Performance:** Target 100/100 Lighthouse scores. Use `next/image` for automatic WebP optimization. Minimize heavy client-side JavaScript.

## 5. Backend/Systems Guidelines
- **API Routes:** Use Next.js Route Handlers for lightweight forms (e.g., Contact Us, Lead Capture) feeding into the internal D1 database or a lightweight email dispatcher.
- **Static vs Dynamic:** Heavily favor SSG (Static Site Generation) for marketing pages. Only use SSR where strictly necessary.

## 6. Testing & QA Gates
- Playwright E2E tests must verify form submissions, CTA routing, and mobile responsiveness.
- Run automated Lighthouse or Axe accessibility audits.

## 7. Architectural Improvements & Tech Debt
- **Improvement:** Implement strict structured data (JSON-LD) for SEO.
- **Security:** Ensure any contact forms have CSRF and basic rate-limiting to prevent spam.
