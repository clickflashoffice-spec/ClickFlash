# Cloudflare Pages Deployment Guide

## Overview

This guide covers deploying the ClickFlash frontends to Cloudflare Pages:

- Website (Next.js 15)
- Management Hub (React 19 + Vite)
- Customer Gallery (React 19 + Vite)
- MoneyTrash (Next.js 16)

---

## Frontend Configuration Summary

| App                  | Framework       | Build Command   | Output Directory | Port |
| -------------------- | --------------- | --------------- | ---------------- | ---- |
| **Website**          | Next.js 15      | `npm run build` | `out/`           | 3001 |
| **Management Hub**   | React 19 + Vite | `npm run build` | `dist/`          | 5173 |
| **Customer Gallery** | React 19 + Vite | `npm run build` | `dist/`          | 5174 |
| **MoneyTrash**       | Next.js 16      | `npm run build` | `.next/`         | 3000 |

---

## Deployment Methods

### Method 1: Wrangler CLI (Recommended)

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
npx wrangler pages login

# Deploy
npx wrangler pages deploy <output-directory> --project-name=<project-name>
```

### Method 2: GitHub Actions (CI/CD)

See [.github/workflows/pages.yml](.github/workflows/pages.yml) for existing workflow.

### Method 3: Cloudflare Dashboard

Manual deployment via https://dash.cloudflare.com/pages

---

## Per-App Deployment

### Website (`apps/website`)

```bash
cd apps/website

# Build
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy out --project-name=clickflash-website

# Or with custom domain
npx wrangler pages deploy out \
  --project-name=clickflash-website \
  --branch=production
```

**wrangler.toml (already configured):**

```toml
name = "clickflash-website"
compatibility_date = "2024-02-08"
pages_build_output_dir = "out"
```

### Management Hub Frontend (`apps/management`)

```bash
cd apps/management

# Build
npm run build

# Deploy
npx wrangler pages deploy dist \
  --project-name=management-hub \
  --branch=production
```

**Required Environment Variables:**

```
VITE_API_URL=https://management-hub.<account>.workers.dev
VITE_WS_URL=wss://management-hub.<account>.workers.dev
```

### Customer Gallery Frontend (`apps/gallery`)

```bash
cd apps/gallery

# Build
npm run build

# Deploy
npx wrangler pages deploy dist \
  --project-name=customer-gallery \
  --branch=production
```

**Required Environment Variables:**

```
VITE_API_URL=https://gallery-backend.<account>.workers.dev
VITE_STRIPE_PUBLIC_KEY=pk_live_...
VITE_GALLERY_URL=https://gallery.feethub.com
```

### MoneyTrash Frontend (`apps/moneytrash`)

```bash
cd apps/moneytrash

# Build
npm run build

# Deploy (Next.js on Pages)
npx wrangler pages deploy .next \
  --project-name=moneytrash \
  --branch=production
```

**Required Environment Variables:**

```
NEXT_PUBLIC_API_URL=https://moneytrash-api.<account>.workers.dev
NEXT_PUBLIC_GALLERY_URL=https://gallery.feethub.com
```

---

## Configuration Files

### wrangler.toml for Pages

**apps/website/wrangler.toml** (already exists):

```toml
name = "clickflash-website"
compatibility_date = "2024-02-08"
pages_build_output_dir = "out"
```

**New files needed:**

`apps/management/wrangler.toml`:

```toml
name = "management-hub-pages"
compatibility_date = "2024-10-01"
pages_build_output_dir = "dist"

[vars]
API_URL = "https://management-hub.your-account.workers.dev"
```

`apps/gallery/wrangler.toml`:

```toml
name = "customer-gallery-pages"
compatibility_date = "2024-10-01"
pages_build_output_dir = "dist"

[vars]
API_URL = "https://gallery-backend.your-account.workers.dev"
STRIPE_PUBLIC_KEY = "pk_live_..."
```

`apps/moneytrash/wrangler.toml`:

```toml
name = "moneytrash-pages"
compatibility_date = "2024-10-01"
pages_build_output_dir = ".next"
```

---

## Custom Domains

### Set Up Custom Domain

```bash
# Add custom domain to Pages project
npx wrangler pages domain add gallery.feethub.com --project-name=customer-gallery

# Or via API
curl -X POST "https://api.cloudflare.com/client/v4/pages/projects/gallery/pages/custom_domains" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"hostname": "gallery.feethub.com"}'
```

### Expected Domains

| App        | Production Domain        | Staging Domain               |
| ---------- | ------------------------ | ---------------------------- |
| Website    | `www.feethub.com`        | `www.feethub.pages.dev`      |
| Management | `admin.feethub.com`      | `management-hub.pages.dev`   |
| Gallery    | `gallery.feethub.com`    | `customer-gallery.pages.dev` |
| MoneyTrash | `moneytrash.feethub.com` | `moneytrash.pages.dev`       |

---

## GitHub Actions Workflow

Create `.github/workflows/pages-deploy.yml`:

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_API_URL: ${{ secrets.MANAGEMENT_API_URL }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: management-hub
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

---

## Environment Variables

### Build-Time Variables (Vite/Next.js)

These must be prefixed with `VITE_` (Vite) or `NEXT_PUBLIC_` (Next.js):

| Variable              | App                 | Example Value                        |
| --------------------- | ------------------- | ------------------------------------ |
| `VITE_API_URL`        | Management, Gallery | `https://api.feethub.com`            |
| `VITE_WS_URL`         | Management          | `wss://api.feethub.com`              |
| `NEXT_PUBLIC_API_URL` | MoneyTrash          | `https://moneytrash-api.feethub.com` |
| `STRIPE_PUBLIC_KEY`   | Gallery             | `pk_live_...`                        |

### Setting Build Variables

**Vite (.env.production):**

```bash
VITE_API_URL=https://management-hub.your-account.workers.dev
```

**GitHub Actions:**

```yaml
- name: Build
  run: npm run build
  env:
    VITE_API_URL: ${{ secrets.MANAGEMENT_API_URL }}
```

---

## Troubleshooting

### Build Failures

**Error:** `Module not found`

```
Solution: Ensure all dependencies are in package.json and npm ci ran successfully
```

**Error:** `VITE API_URL is not defined`

```
Solution: Create .env.production with VITE_ prefixed variables
```

### Deployment Failures

**Error:** `Directory not found`

```
Solution: Verify build output directory exists and matches wrangler.toml config
```

**Error:** `Project name already exists`

```
Solution: Use --project-name flag or delete existing project in Cloudflare dashboard
```

### Runtime Errors

**Error:** `Failed to fetch` (CORS issues)

```
Solution: Verify ALLOWED_ORIGINS in Worker wrangler.toml includes Pages domain
```

**Error:** `404 on static assets`

```
Solution: Check _headers file for proper cache and routing rules
```

---

## Headers Configuration

Create `public/_headers` for proper caching and security:

```
/static/*
  Cache-Control: public, max-age=31536000, immutable

/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
```

---

## Performance Optimization

### 1. Enable Minification

Cloudflare Pages enables minification automatically for static assets.

### 2. Use Image Optimization

For Next.js, use `next/image` which automatically optimizes images.

### 3. Enable Compression

Cloudflare Pages enables Gzip/Brotli compression automatically.

### 4. Set Cache Headers

```toml
# wrangler.toml
[env.production]
routes = [
  { pattern = "gallery.feethub.com", zone_name = "feethub.com" }
]
```

---

## Verification Checklist

- [ ] All apps build successfully
- [ ] Environment variables set correctly
- [ ] Custom domains configured and SSL provisioned
- [ ] CORS headers allow appropriate origins
- [ ] Assets load correctly
- [ ] API calls reach correct backend
- [ ] Performance is acceptable
- [ ] Mobile responsive
- [ ] SSL certificate active

---

## Deployment Commands Reference

```bash
# Website
cd apps/website && npm run build && npx wrangler pages deploy out --project-name=clickflash-website

# Management Hub
cd apps/management && npm run build && npx wrangler pages deploy dist --project-name=management-hub

# Customer Gallery
cd apps/gallery && npm run build && npx wrangler pages deploy dist --project-name=customer-gallery

# MoneyTrash
cd apps/moneytrash && npm run build && npx wrangler pages deploy .next --project-name=moneytrash
```

---

**Document Version:** 1.0  
**Last Updated:** March 22, 2026
