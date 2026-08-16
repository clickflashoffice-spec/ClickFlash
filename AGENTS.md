<!-- AGENTS-GENERATED-START -->
# AGENTS.md

> Universal AI Agent instructions for the ClickFlash Monorepo. Specific rules in [`.agents/rules/`](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/) — [Architecture](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/architecture.md), [Frontend Patterns](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/frontend-patterns.md), [Backend](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/backend.md), [Database](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/database.md), [Testing](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/testing.md), [Git Workflow](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/git-workflow.md), [SDD Workflow](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/sdd-workflow.md).

## Project Overview

ClickFlash is an enterprise-grade automated photography concession and edge-to-cloud resort media platform. It has evolved to the **V6.0 The Autonomous Ecosystem Paradigm**. It utilizes AI for auto-culling, biometric selfie-linking, WebRTC live tracking, Rust mobile edge-computing, and dynamic yield pricing to exceed all competitors (DEI, Pomvom, Fotiqo).

## Setup Commands

- Install dependencies: `pnpm install`
- Start Master Studio OS (Headless Orchestrator): `pnpm run dev:master` (Port 8090)
- Start Touch Kiosk: `pnpm run dev:touch` (Port 8091)
- Start Management Hub (Command Center): `pnpm run dev:management` (Port 5175)
- Start Gallery Portal: `pnpm run dev:gallery` (Port 5176)
- Start Website: `pnpm run dev:website` (Port 3001)
- Run All Tests: `npm run test:all`
- Typecheck All Apps: `npm run typecheck:all`

## Monorepo Map

| Application / Package | Technology Stack | Primary Purpose |
| --- | --- | --- |
| `apps/desktop/master` | Electron 39 + Fastify + Redis Streams | Headless Edge Node, LAN Gateway (Port 8090), WebRTC Command Hub |
| `apps/desktop/touch` | Electron 39 + React 19 | Guest Touch Kiosk, Attract Screensaver |
| `apps/desktop/moneytrash` | Electron 39 + Vite + React 19 | AI Auto-Culling, Burst-to-Video Engine, Unsold Batch Pipeline |
| `apps/desktop/installer` | Electron 39 | Cross-Platform Desktop Installer & Auto-Updater Generator |
| `apps/desktop/license-generator`| Electron 39 | Cryptographic Hardware-Locked License Generator |
| `apps/management` | Vite + React 19 | Command Center, Live WebRTC Tracking, ClickFlash Agent CRM |
| `apps/gallery` | React 19 + Tailwind + Stripe | Guest Self-Service, Selfie-to-Vector DB Biometric Linking |
| `apps/backend/cloud-backend` | Cloudflare Worker (D1 + R2) | Edge API, Dynamic Yield Pricing Engine, Webhooks, Payouts |
| `apps/backend/mcp-server` | Model Context Protocol SDK | Autonomous AI Agent Studio Toolchain & Automation Engine |
| `apps/backend/ai-worker` | FastAPI / Python | Local/Cloud Computer Vision, ArcFace & Sharpness Inferencing |
| `apps/mobile/pro` | Expo React Native + Rust | Field App, Rust Core (Offline First), WebRTC Receiver, UWB/BLE Beacon |
| `apps/mobile/consumer` | Expo React Native | Guest Mobile Pass, BLE Proximity Linking, NLP Smart Album Search |
| `packages/ai` | TypeScript / Gemini REST | Shared AI Models, Vector Search, NLP Admin Agents |
| `packages/types` | TypeScript | Core Domain Entity Interfaces & Universal Data Contracts |
| `packages/ui` | React 19 + Tailwind | Shared Glassmorphic UI Primitives & Interactive Components |

## Essential Commands

| Command | Purpose | When to Run |
| --- | --- | --- |
| `npm run typecheck:all` | Monorepo strict TypeScript check across all apps | After every code change |
| `pnpm --filter clickflash-master test` | Run Master OS backend tests | After editing `apps/master` |
| `npm run build:all` | Verify full Turborepo production build bundle | Before creating release PRs |
| `npm run lint:all` | Run ESLint across all projects | Pre-commit validation |

## Verification Cycle

After every code change, execute the following non-negotiable verification sequence before declaring complete:
1. **Typecheck**: `npm run typecheck:all` (must return Exit code 0 with 0 errors).
2. **Targeted Tests**: `pnpm --filter <app-name> test` (all tests must pass).
3. **Lint**: `npm run lint:all`.

## Code Style & Invariants (V6.0 Autonomous Rules)

1. **Event-Driven Over SQL**: Direct SQLite inserts for ingestion are deprecated. The Master OS must push events to Redis Streams `publishEvent`, mimicking an enterprise Kafka pipeline.
2. **Zero-Friction Linking**: Do NOT build QR code or barcode scanners. All linking is done via Biometric Vector DB (Selfie-First) or BLE/UWB Proximity.
3. **Headless Master**: Do not add UI views to `apps/master`. It is a headless orchestrator. Add all UI to `apps/management` Command Center.
4. **Rust First on Mobile**: For performance-heavy tasks in `apps/mobile-pro` (like offline sync queues, WebRTC, BLE), push logic to the `clickflash-rust-core` module.
5. **No Camera-Card Deletion**: Field mobile apps must NEVER delete original photos from camera memory cards.
6. **Offline-First Resilience**: Mobile apps must function completely offline. Syncing happens instantly via Redis Streams when connectivity returns.

## Prohibitions

- **Never** hardcode plain text secrets or API keys in source files.
- **Never** mix stdout and stderr output on CLI / worker processes.
- **Never** bypass the verification cycle (`npm run typecheck:all`).
- **Never** execute destructive database queries (`DROP TABLE`, `TRUNCATE`) without automated snapshot backup.
- **Never** push directly to `main` branch.

## Rule File References

- 🏛️ [Architecture Rules](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/architecture.md)
- 🎨 [Frontend Patterns](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/frontend-patterns.md)
- ⚡ [Backend & Edge Rules](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/backend.md)
- 💾 [Database & Storage Rules](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/database.md)
- 🧪 [Testing Strategy](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/testing.md)
- 🌿 [Git & Release Workflow](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/git-workflow.md)
- 🎯 [Spec-Driven Development](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/sdd-workflow.md)
- 🤖 [/goal Swarm Protocol](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/goal-command.md)

---
*Generated by `agents-generator` for ClickFlash Ecosystem V6.0*
<!-- AGENTS-GENERATED-END -->
