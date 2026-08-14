# ClickFlash Website

> Next.js 15 marketing site with cutting-edge performance, SEO, and accessibility.

## Overview

The ClickFlash Website is a high-performance marketing site built with:

- **Next.js 15** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **Tailwind CSS 4** - Utility-first CSS with CSS-first configuration
- **TypeScript** - Type-safe development
- **Cloudflare Pages** - Edge deployment and CDN

## Quick Start

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with metadata
│   ├── page.tsx           # Homepage
│   ├── metadata.ts        # Centralized SEO configuration
│   ├── sitemap.ts         # Dynamic sitemap generation
│   ├── robots.ts          # Robots.txt configuration
│   └── [...]/             # Page routes
├── components/
│   ├── layout/            # Layout components (Navbar, Footer)
│   ├── sections/          # Page sections (Hero, Features)
│   ├── ui/                # Reusable UI components
│   └── seo/               # SEO components (JsonLd)
├── hooks/
│   └── usePerformance.ts  # Web Vitals tracking
├── lib/
│   ├── api.ts             # API utilities
│   ├── settings.ts        # Website settings
│   └── translations.ts    # i18n translations
└── types/                 # TypeScript types
```

## Key Features

### SEO Optimization

- ✅ Comprehensive metadata configuration in `app/metadata.ts`
- ✅ OpenGraph and Twitter Card support
- ✅ JSON-LD structured data
- ✅ Dynamic sitemap generation
- ✅ Hreflang for internationalization
- ✅ Canonical URLs

### Performance

- ⚡ Core Web Vitals monitoring via `usePerformance` hook
- ⚡ Lazy loading for 3D/heavy components
- ⚡ Image optimization with WebP/AVIF detection
- ⚡ Bundle splitting and code splitting
- ⚡ Edge deployment on Cloudflare Pages

### Accessibility

- ♿ WCAG 2.1 AA compliant
- ♿ Keyboard navigation support
- ♿ Screen reader optimized
- ♿ ARIA labels and landmarks
- ♿ Reduced motion support
- ♿ Focus management

### Mobile First

- 📱 Responsive design with Tailwind CSS
- 📱 Touch-friendly interfaces
- 📱 Optimized mobile performance
- 📱 Device capability detection

## Environment Variables

Create a `.env.local` file:

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://api.clickflash.com

# Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your-verification-code

# Features
NEXT_PUBLIC_ENABLE_3D=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

## Testing

### Unit Tests (Vitest)

```bash
# Run unit tests
npm run test

# Watch mode
npm run test:watch
```

### E2E Tests (Playwright)

```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e -- --ui

# Run specific test
npm run test:e2e -- home.spec.ts
```

### Test Coverage

- **SEO**: Meta tags, structured data, sitemap
- **Performance**: Core Web Vitals thresholds
- **Accessibility**: ARIA, color contrast, keyboard nav
- **Mobile**: Responsive breakpoints, touch targets
- **Navigation**: Links, routing, external URLs

## Deployment

### Cloudflare Pages (Production)

```bash
# Build for Cloudflare
npm run build

# Deploy
npx wrangler pages deploy .next
```

### Environment-specific Settings

The site automatically adapts based on environment:

- **Development**: Hot reload, detailed error pages
- **Staging**: Production build with test data
- **Production**: Optimized, analytics enabled

## Performance Budgets

| Metric | Target | Maximum |
|--------|--------|---------|
| LCP | < 2.0s | < 2.5s |
| FID | < 50ms | < 100ms |
| CLS | < 0.05 | < 0.1 |
| FCP | < 1.0s | < 1.8s |
| TTFB | < 400ms | < 800ms |
| Bundle Size | < 200KB | < 500KB |

## Code Quality

### Linting

```bash
# ESLint
npm run lint

# Type checking
npx tsc --noEmit
```

### Pre-commit Hooks

- TypeScript strict mode
- ESLint with Next.js config
- Import organization
- Unused variable detection

## Troubleshooting

### Build Issues

```bash
# Clean build cache
rm -rf .next
npm run build
```

### 3D Components Not Loading

- Check WebGL support: `useDeviceCapabilities().hasWebGL`
- Fallback to static images for unsupported devices
- Use `<ErrorBoundary>` wrapper

### Performance Issues

- Run Lighthouse audit
- Check `usePerformance` metrics
- Verify image optimization
- Review bundle analyzer

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Ensure accessibility compliance
4. Update documentation

## License

Proprietary - ClickFlash Photography

## Support

For issues and feature requests, contact the development team.

---

**Built with Next.js 15, React 19, and Tailwind CSS 4**
