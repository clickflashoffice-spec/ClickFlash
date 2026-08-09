# ClickFlash Ecosystem Goals v2.0.0

## Vision
To become the definitive, end-to-end operating system for high-volume photography businesses globally, seamlessly bridging offline resilience with cloud-scale monetization.

## Core Goals

### 1. Zero-Friction Operations
- **Plug and Play:** A new studio should be able to install the ecosystem and serve their first customer in under 15 minutes.
- **Network Agnostic:** The system must never block a sale or a photo transfer due to poor internet connectivity. Offline-first is not a feature; it is the foundation.
- **Mobile Roaming Capture:** Mobile photographer roaming capture reduces setup time.
- **Component Selection:** Installer wizard with component selection.
- **Offline Activation:** License generator for offline activation.

### 2. Bulletproof Reliability
- **Zero Data Loss:** Once a photo is ingested by the Master, it is cryptographically hashed, queued, and guaranteed to reach cloud storage.
- **Self-Healing:** Ecosystem components must auto-recover from crashes, memory leaks, and network drops without human intervention.
- **Immutable Audit Trail:** Append-only event ledger (migration 070) for immutable audit trail.
- **Durable Delivery:** Durable delivery outbox with checksum-bound receipts.
- **Installer Integrity:** Ed25519 payload verification for installer integrity.

### 3. Ultimate Scalability
- **Fleet Management:** Effortlessly support single-kiosk boutique studios up to 500-kiosk enterprise resort deployments.
- **Cloud Economics:** Leverage Cloudflare (Workers, D1, R2) to achieve near-infinite scale with zero cold starts and minimal operational overhead.
- **Cloud Infrastructure:** 4 Cloudflare Workers (gallery, management, moneytrash, update-server).
- **Tenant Isolation:** 3 D1 databases for tenant isolation.
- **Media Delivery:** R2 object storage for media delivery.

### 4. Revenue Maximization for Studios
- **Frictionless Checkout:** The gallery and kiosk checkout experiences must be hyper-optimized for conversions.
- **MoneyTrash Integration:** Turn traditionally discarded (unsold) photos into a secondary revenue stream with zero extra effort from the photographer.
- **B2B Commerce:** B2B commerce with MoneyTrash dedicated purchase flow.
- **Abandoned Cart Recovery:** Abandoned cart recovery with D1 sync.
- **Secure Payments:** Server-priced Stripe Checkout with webhook verification.

### 5. Security & Privacy First
- **Zero Third-Party Auth:** 100% custom authentication (no third-party auth).
- **Biometric Privacy:** Privacy-preserving biometric flow (device-salted face vectors).
- **Secure Licensing:** Asymmetric signing for offline licenses.
- **Encrypted Transport:** AES-256-GCM encrypted transport for paired devices.
- **Strict Validation:** Zod validation at all boundaries.

### 6. Roaming Photography Intelligence
- **Camera Tethering:** Nikon D7000 USB/PTP tether with immutable camera originals.
- **Smart Learning:** Shooting-spot learning with privacy-safe observations.
- **Auto-Editing:** Confidence-gated automatic JPEG editing.
- **Flexible Delivery:** Multi-destination delivery (Kiosk, Master, Cloud).

### 7. Developer Experience
- **Unified Builds:** Monorepo with Turborepo for unified builds.
- **DRY Architecture:** Shared packages for DRY contracts.
- **AI Integration:** MCP server for AI-assisted development.
- **Observability:** Structured logging across all apps.
