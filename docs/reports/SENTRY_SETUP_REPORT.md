# ClickFlash Ecosystem — Sentry Error Monitoring Setup

> **Date:** 2026-06-12
> **Status:** ✅ COMPLETE — All 6 apps configured
> **Action Required:** Add SENTRY_DSN to environment variables / wrangler secrets

---

## 🎯 SENTRY STATUS BY APP

| App | Package | Status | DSN Config | Location |
|-----|---------|--------|-----------|----------|
| **Gallery Worker** | `@sentry/cloudflare` | ✅ Already configured | `env.SENTRY_DSN` | `server.ts` lines 1, 17, 1443-1455 |
| **MoneyTrash Worker** | `@sentry/cloudflare` | ✅ **Just configured** | `env.SENTRY_DSN` | `index.ts` lines 31, 112-120 |
| **Management Worker** | `@sentry/cloudflare` | ✅ Already configured | `env.SENTRY_DSN` | `server.ts` lines 1, 37, 2477 |
| **Website** | `@sentry/nextjs` (loader) | ✅ **Just configured** | `NEXT_PUBLIC_SENTRY_DSN` | `layout.tsx` lines 105-126 |
| **Master (Electron)** | `@sentry/electron` | ✅ **Just configured** | `SENTRY_DSN` env var | `electron-main.js` lines 24-42 |
| **Touch (Electron)** | `@sentry/electron` | ✅ **Just configured** | `SENTRY_DSN` env var | `main.js` lines 12-30 |

---

## 📋 SETUP INSTRUCTIONS

### Step 1: Create Sentry Projects

Go to [sentry.io](https://sentry.io) and create 6 projects:

1. `clickflash-gallery` (Cloudflare Worker)
2. `clickflash-moneytrash` (Cloudflare Worker)
3. `clickflash-management` (Cloudflare Worker)
4. `clickflash-website` (Next.js)
5. `clickflash-master` (Electron)
6. `clickflash-touch` (Electron)

### Step 2: Get DSNs

For each project, go to **Settings → Client Keys (DSN)** and copy the DSN.

It looks like:
```
https://xxxxxx@yyyyyy.ingest.sentry.io/zzzzzz
```

### Step 3: Configure DSNs

#### Cloudflare Workers (Gallery, MoneyTrash, Management)

```bash
# Gallery
cd apps/gallery/backend
npx wrangler secret put SENTRY_DSN
# Paste DSN for clickflash-gallery

# MoneyTrash
cd apps/moneytrash/cloudflare
npx wrangler secret put SENTRY_DSN
# Paste DSN for clickflash-moneytrash

# Management
cd apps/management/backend
npx wrangler secret put SENTRY_DSN
# Paste DSN for clickflash-management
```

#### Website (Next.js)

Add to `.env.local`:
```
NEXT_PUBLIC_SENTRY_DSN=https://xxxxxx@yyyyyy.ingest.sentry.io/zzzzzz
```

And to Cloudflare Pages environment variables in the dashboard.

#### Desktop Apps (Master, Touch)

Add to `.env` file or system environment:
```
SENTRY_DSN=https://xxxxxx@yyyyyy.ingest.sentry.io/zzzzzz
```

---

## 🔧 WHAT WAS CONFIGURED

### Gallery Worker (Already Had It)
- `Sentry.withSentry()` wrapper around `fetch` handler
- `tracesSampleRate: 0.1` (10% of transactions traced)
- `release: "clickflash-gallery@4.2.0"`
- Graceful fallback when `SENTRY_DSN` is absent

### MoneyTrash Worker (New)
- Added `SENTRY_DSN?: string` to `Env` interface
- Added `captureException()` in error handler (line 112-120)
- Dynamic import of `@sentry/cloudflare` (only loads when DSN is set)
- Graceful fallback to `console.error` if Sentry fails

### Management Worker (Already Had It)
- `Sentry.withSentry()` wrapper around `fetch` handler
- Similar configuration to Gallery

### Website (New)
- Added Sentry browser loader script in `layout.tsx`
- Uses `browser.sentry-cdn.com` for lightweight loading
- Session replay: 1% sample rate, 100% on error
- Performance tracing: 10% sample rate
- Only loads in production when `NEXT_PUBLIC_SENTRY_DSN` is set

### Master Electron (New)
- Added `@sentry/electron` initialization in `electron-main.js`
- Main process crash reporting
- Release tracking with `app.getVersion()`
- Only initializes when `SENTRY_DSN` env var is set

### Touch Electron (New)
- Added `@sentry/electron` initialization in `main.js`
- Same configuration as Master
- Release tracking with `app.getVersion()`

---

## 📊 SENTRY FEATURES ENABLED

| Feature | Gallery | MoneyTrash | Management | Website | Master | Touch |
|---------|---------|-----------|-----------|---------|--------|-------|
| Error capture | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Crash reporting | N/A | N/A | N/A | N/A | ✅ | ✅ |
| Performance tracing | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Session replay | N/A | N/A | N/A | ✅ | N/A | N/A |
| Release tracking | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Environment tags | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🚀 DEPLOYMENT STATUS

| App | Deployed | Version |
|-----|----------|---------|
| Gallery Worker | ✅ Live | `55a6665a...` |
| MoneyTrash Worker | ✅ **Just deployed** | `c5b1926a...` |
| Management Worker | ✅ Live | `02c40d03...` |
| Website Pages | ✅ Live | `4f379773` |
| Master | ✅ Configured in source | N/A (desktop) |
| Touch | ✅ Configured in source | N/A (desktop) |

---

## 🎯 NEXT STEPS

1. **Create Sentry account** (if you don't have one)
2. **Create 6 projects** and copy DSNs
3. **Add DSNs to secrets** (wrangler for Workers, env vars for desktop)
4. **Test** — Trigger an error and verify it appears in Sentry dashboard
5. **Set up alerts** — Configure Slack/email notifications for P1 errors

---

## 💰 COST

- Sentry Team plan: **$26/month** (5M errors, 10K performance transactions)
- Session replay: Included (500 replays/month)
- Additional transactions: $0.50 per 1K

---

*Sentry setup by Hermes Agent*
*All apps are configured and ready — just add DSNs to activate*
