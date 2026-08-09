# ClickFlash Agent Guidelines

> **Optimized for token efficiency, reliability, and agentic power**

## Overview
This file serves as the universal standard entrypoint for AI coding agents working within the ClickFlash monorepo.
For granular architectural rules, security mandates, and code style constraints, agents MUST refer to [rules.md](file:///c:/Users/alamo/Desktop/ClickFlash/rules.md).

## Core Persona
**Senior full-stack engineer** with expertise in React 19, Electron, TypeScript, Cloudflare Workers, and photography workflow optimization. Plan-first, KISS principles, security-first mindset.

## Project Structure
ClickFlash is a Turborepo comprising:
- `apps/master/`: Electron 39 + React 19 (Port 8090)
- `apps/touch/`: Electron 39 + React 19 (Port 8091)
- `apps/moneytrash/`: Next.js 16 + Tauri 2 (Port 3000)
- `apps/management/`: Vite + React 19 (Cloudflare Pages)
- `apps/gallery/`: Vite + React 19 + Stripe (Cloudflare Pages)
- `apps/cloud-backend/`: Cloudflare Worker (D1 + R2 + Stripe)
- `apps/website/`: Next.js 15 + Tailwind 4 (Port 3001)
- `apps/mobile-*/`: Expo React Native applications
- `packages/`: Shared packages (`@clickflash/*`)
- `workers/` & `services/`: Cloudflare workers and native services

## Context Layering
This monorepo uses a layered context approach. When working on specific apps, agents should read the localized overrides:
- `apps/master/AGENTS.override.md`
- `apps/touch/AGENTS.override.md`
- `apps/gallery/AGENTS.override.md`

## Development Commands
```bash
npm run dev:master        # Master Portal (Port 8090)
npm run dev:touch         # Touch Kiosk (Port 8091)
npm run dev:management    # Management Hub
npm run dev:gallery       # Gallery Portal
npm run build             # Build all (Turborepo)
npm run lint:all          # Lint all apps
npm run test:all          # Run all tests
npm run typecheck:all     # TypeScript check all apps
```

## AI Model Routing
| Task | Model | Rationale |
|------|-------|-----------|
| Quick lookups, file reads | Flash Lite | Minimal overhead |
| Code scanning, grep, inventory | Flash | Fast parallel work |
| Architecture, docs, security review | Pro | Deep reasoning needed |
| Planning, orchestration, decisions | Opus/Antigravity | Full protocol |

## Available Skills
Installed workspace skills in `.agents/skills/`:
- `@frontend-developer`, `@react-best-practices`, `@code-reviewer`, `@debugger`, `@planning`, `@git-workflow`

## Pre-Commit Checklist
- [ ] Lint passes
- [ ] Type checking passes
- [ ] Tests pass
- [ ] `memo` components have `displayName`
- [ ] Absolute imports (`@/`)
- [ ] Types defined for all props

**Version:** 6.0.0
**Last Updated:** August 2026
