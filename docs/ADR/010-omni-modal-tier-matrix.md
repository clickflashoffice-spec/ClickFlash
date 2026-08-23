# ADR-010: Omni-Modal Concession Tier Matrix & Multi-Tenant Deployment

## Status
Accepted

## Context
ClickFlash must cater to diverse commercial photography markets:
1. Traditional single-location Santa grottos, mall kiosks, and cruise studios needing local dye-sub printing.
2. Independent freelance event photographers needing a SaaS web portal without desktop hardware.
3. Multi-venue enterprise theme parks and waterparks needing completely headless edge nodes with millions of guest photos and multi-kiosk attract screens.

## Decision
ClickFlash defines three dynamically switchable operational modes within the unified monorepo:

1. **Studio Mode (Legacy Foundation)**:
   - Master OS runs with full desktop UI for local DSLR tethering, manual crop/grading, and instant high-speed dye-sublimation printer queues (DNP, Mitsubishi).
2. **SaaS Cloud Mode (Agency Foundation)**:
   - Freelance photographers use `apps/photographer-portal` (zero-install WebAssembly client) and `apps/gallery` backed directly by `apps/backend/cloud-backend` (Cloudflare Workers, D1, R2). No desktop runtime required.
3. **Autonomous Mode (Enterprise Theme Parks)**:
   - Master OS runs as a headless LAN gateway (Port 8090 Fastify + SQLite WAL), ingesting burst captures from rollercoasters (`ride-node`) and mobile field photographers (`apps/mobile/pro`), routing embeddings to VP-Tree, and driving multi-screen Touch Kiosks (`apps/desktop/touch`).

## Consequences
- **Positive**:
  - Single codebase serves individual freelance photographers up to Tier-1 theme park enterprises.
  - Maximum revenue flexibility and lowest deployment friction across concession types.
- **Negative**:
  - Requires maintaining mode-dependent dependency guards and build configurations.
