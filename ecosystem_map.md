# ClickFlash V5 Ecosystem Map

> **Comprehensive Architecture & Dependency Graph**

## 1. Edge & On-Premise Subsystem (Resort Local Network)
- **Master Edge Node (`apps/desktop/master`)**: Headless Electron Node running Fastify, SQLite (DPAPI-encrypted), RxDB GraphQL sync, Libvips processing.
- **Touch Kiosks (`apps/desktop/touch`)**: Guest-facing React UI running on kiosk terminals.
- **Mobile Pro App (`apps/mobile/pro`)**: Photographer app with offline Rust core for tethering & uploading.
- **Consumer App (`apps/mobile/consumer`)**: Guest mobile pass and BLE linking.

## 2. Cloud Subsystem (Global Multi-Tenant)
- **Cloud Backend (`apps/backend/cloud-backend`)**: Cloudflare Worker running Hono API, D1 (database), R2 (blob storage). Handles Stripe webhooks and global synchronization.
- **AI Worker (`apps/backend/ai-worker`)**: FastAPI/Python Python worker for ArcFace similarity and auto-culling.
- **Management Hub (`apps/management`)**: Command center React PWA.
- **Guest Self-Service (`apps/self-service`)**: Instant download PWA for guests.
- **Gallery (`apps/gallery`)**: Holographic 3D media viewer.
- **Photographer Portal (`apps/photographer-portal`)**: Zero-install web uploader via WASM.

## 3. Tooling & Infra
- **Model Context Protocol (`apps/backend/mcp-server`)**: Automated agent toolchain for ClickFlash ecosystem.
- **Installer & License (`apps/desktop/installer`, `license-generator`)**: Deployment and hardware lock generators.
- **Monorepo Packages**: `@clickflash/logger`, `@clickflash/errors`, `@clickflash/ui`, `@clickflash/validation`, `@clickflash/ai`, `@clickflash/types`.

## 4. Integration Boundaries
- **Stripe**: Handles payments in `cloud-backend` via webhooks.
- **Resend**: Transactional emails for ghost links and receipts.
- **Twilio/WhatsApp**: Alerting and chat interfaces.
