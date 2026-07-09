# ClickFlash Ecosystem v2.0.0 — Production Overview

Welcome to the **ClickFlash Photography Ecosystem v2.0.0 (Production Release)**.

## Architectural Principles
- **Zero Paid SaaS**: Completely custom infrastructure. No Vercel, Auth0, Clerk, Pusher, Algolia, OpenAI, Adobe, or paid third-party analytics.
- **Offline First**: Local Studio operations (Master Portal & Touch Kiosks) function 100% offline via local SQLite databases, mDNS Bonjour discovery, custom WebSockets, and Ed25519 cryptographic license verification.
- **Hybrid Cloud Edge**: Cloud components run on self-hosted or Cloudflare Edge workers (`D1` SQLite, `R2` object storage) with custom JWT / Magic Link authentication.

## Included Components
1. **Master Portal (`apps/master`)**: Port 8090 — Studio controller, POS, print queue, thermal monitor, WASM photo editor.
2. **Touch Kiosk (`apps/touch`)**: Port 8091 — Customer self-service station with RFID/Face login.
3. **Management Hub (`apps/management`)**: Executive cloud dashboard with Fleet Monitor & `Cmd+K`.
4. **Client Portal (`apps/gallery`)**: Customer proofing, lightboxes, and Stripe checkout.
5. **MoneyTrash Ingestor (`apps/moneytrash`)**: Port 3000 — SD card bulk RAW/JPEG upload tool.
6. **Marketing Website (`apps/website`)**: Port 3001 — Next.js 15 SEO marketing site.
7. **Offline License Generator (`apps/license-generator`)**: Ed25519 offline license signer.
8. **All-In-One Installer (`apps/installer`)**: Component setup wizard.
