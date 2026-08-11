<!-- AGENTS-GENERATED-START -->
# AGENTS.md

> Universal AI Agent instructions for the ClickFlash Monorepo. Specific rules in [`.agents/rules/`](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/) — [Architecture](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/architecture.md), [Frontend Patterns](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/frontend-patterns.md), [Backend](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/backend.md), [Database](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/database.md), [Testing](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/testing.md), [Git Workflow](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/git-workflow.md), [SDD Workflow](file:///C:/Users/alamo/Desktop/ClickFlash/.agents/rules/sdd-workflow.md).

## Project Overview

ClickFlash is an enterprise-grade automated photography concession and edge-to-cloud resort media platform comprising 16 interconnected applications, microservices, and shared packages orchestrated via Turborepo and `pnpm`.

## Setup Commands

- Install dependencies: `pnpm install`
- Start Master Studio OS: `pnpm run dev:master` (Port 8090)
- Start Touch Kiosk: `pnpm run dev:touch` (Port 8091)
- Start Management Hub: `pnpm run dev:management` (Port 5175)
- Start Gallery Portal: `pnpm run dev:gallery` (Port 5176)
- Start Website: `pnpm run dev:website` (Port 3001)
- Run All Tests: `npm run test:all`
- Typecheck All Apps: `npm run typecheck:all`

## Monorepo Map

| Application / Package | Technology Stack | Primary Purpose |
| --- | --- | --- |
| `apps/master` | Electron 39 + React 19 | Central Studio OS, Local SQLite Hub, Kiosk LAN Gateway (Port 8090) |
| `apps/touch` | Electron 39 + React 19 | Guest Touch Kiosk, Attract Screensaver, 128D Face Search (Port 8091) |
| `apps/moneytrash` | Electron 39 + Next.js 16 | Rapid Batch Photo Ingestion, Sharpness / Laplacian Variance Grading |
| `apps/management` | Vite + React 19 | Resort Executive Hub, AI Swarm Command Center, Payroll & Heatmaps |
| `apps/gallery` | Vite + React 19 + Stripe | Guest Web Gallery, Instant Checkout, Segment-Anything AI Backgrounds |
| `apps/cloud-backend` | Cloudflare Worker (D1 + R2) | Edge API, Steganographic Watermarking, Webhooks, Payouts |
| `apps/website` | Next.js 15 + Tailwind 4 | Marketing Portal, Interactive Resort ROI Calculator (Port 3001) |
| `apps/mobile-pro` | Expo React Native | Field Photographer Android USB-OTG/PTP Tether Ingestion & Voice Tagging |
| `apps/mobile-consumer` | Expo React Native | Guest Mobile Photo Pass, Apple Wallet Passbook, Hotspots Map |
| `apps/installer` | Electron 39 | Cross-Platform Desktop Installer & Auto-Updater Generator |
| `apps/license-generator`| Electron 39 | Cryptographic Hardware-Locked License Generator |
| `apps/mcp-server` | Model Context Protocol SDK | Autonomous AI Agent Studio Toolchain & Automation Engine |
| `packages/ai` | TypeScript / Gemini REST | Shared AI Models, Zod Schemas (`AIScore`, `EditParams`), System Prompts |
| `packages/types` | TypeScript | Core Domain Entity Interfaces & Universal Data Contracts |
| `packages/ui` | React 19 + Tailwind | Shared Glassmorphic UI Primitives & Interactive Components |

## Essential Commands

| Command | Purpose | When to Run |
| --- | --- | --- |
| `npm run typecheck:all` | Monorepo strict TypeScript check across all 16 apps | After every code change |
| `pnpm --filter clickflash-master test` | Run Master OS backend and frontend unit tests | After editing `apps/master` |
| `pnpm --filter clickflash-touch test` | Run Touch Kiosk vitest unit tests | After editing `apps/touch` |
| `pnpm --filter star-master-management test` | Run Management Hub test suite | After editing `apps/management` |
| `pnpm --filter star-master-customer test` | Run Gallery Portal test suite | After editing `apps/gallery` |
| `npm run build:all` | Verify full Turborepo production build bundle | Before creating release PRs |
| `npm run lint:all` | Run ESLint across all projects | Pre-commit validation |

## Verification Cycle

After every code change, execute the following non-negotiable verification sequence before declaring complete:
1. **Typecheck**: `npm run typecheck:all` (must return Exit code 0 with 0 errors).
2. **Targeted Tests**: `pnpm --filter <app-name> test` (all tests must pass).
3. **Lint**: `npm run lint:all`.

## Code Style & Invariants

1. **Direct IPC Data DAO**: Master OS local database CRUD must use `window.electron.invoke('repo:request')` via [`dataService.ts`](file:///C:/Users/alamo/Desktop/ClickFlash/apps/master/src/services/dataService.ts). Never proxy local UI queries through HTTP.
2. **LAN Express Gateway**: Port 8090 Express server remains active strictly for LAN Touch Kiosks and Mobile field ingestion.
3. **No Camera-Card Deletion**: Field mobile apps must NEVER delete original photos from camera memory cards.
4. **Offline-First Resilience**: Touch Kiosks and Mobile apps must function completely offline using embedded Web Workers and IndexedDB/SQLite sync queues.
5. **Absolute Imports**: Always use absolute `@/` imports for internal files and `@clickflash/*` for workspace packages.
6. **No Any Types**: Maintain strict TypeScript typing. Avoid `any` assertions.

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

---
*Generated by `agents-generator` for ClickFlash Ecosystem V3.0*
<!-- AGENTS-GENERATED-END -->
