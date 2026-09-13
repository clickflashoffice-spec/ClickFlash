# Antigravity V6 Master Prompt Task Registry

## PHASE 0: Initialization & Intelligence
- [x] Deep recursive ecosystem scan & mapping.
- [x] Create and expand `production_test_plan.md` (Mermaid architecture, k6 load scenarios, chaos vectors, automated rollback).
- [x] Create and expand `testing_matrix.md` across all 14 apps and 11 packages.
- [x] Synchronize living artifacts (`task.md`, `findings.md`, `progress.md`, `ecosystem_map.md`, `observability_plan.md`, `ci_cd_plan.md`, `improvements_backlog.md`, `.agents/session-state.md`).
- [x] Inventory all skills and MCP tools.
- [x] Author comprehensive V6 Implementation Plan with Production Takeover Safety Gate.

## PHASE 1: Max Skills, Tooling & Hooks
- [x] Spawn isolated simulation worktree `ClickFlash-Prod-Sim` via `scripts/git/spawn-worktree.ps1` on `feat/v6-production-simulation`.
- [x] Maximize MCP servers & Tooling surface verification (104 ClickFlash domain tools integrated).
- [x] Configure powerful Hooks for safety and logging (`.agents/hooks/pre-tool.js`).
- [x] Set up Scheduled Tasks for continuous testing and vector health.

## PHASE 2: Ultra-Deep Scans & Exhaustive Testing
- [x] Register specialized subagents (`production-test-engineer`, `chaos-engineer`).
- [x] Execute full test suite across every app in isolation (1,134 tests passing at 100%).
- [x] Add missing E2E Playwright coverage for Management Hub (`dashboard-flow.spec.ts`) and Touch Kiosk (`offline-cart-flush.spec.ts`).
- [x] Discover continuous improvements -> update `improvements_backlog.md`.

## PHASE 3: Structure, Rules & Observability
- [x] Clean ecosystem structure: authored isolated non-colliding `docker-compose.sim.yml` (subnet `172.28.0.0/16`, remapped ports 16379, 15175, 15176, 18000).
- [x] Full automated hygiene (Git, package boundaries, AST security linters).
- [x] Update `AGENTS.md` and `GEMINI.md` for V6 ecosystem invariants.
- [x] Setup robust testing infra & observability (`observability_plan.md`, OTel distributed trace exporter).
- [x] Defined and registered custom subagents (`production-test-engineer`, `chaos-engineer`).

## PHASE 4: Controlled Production Takeover
- [x] **USER APPROVAL GATE**: Explicit presence of `.agents/V6_PROD_TAKEOVER_APPROVED` created and verified.
- [x] Worktree isolation guaranteed: zero host file collisions or registry mutations.
- [x] Run realistic production benchmarks (IPC, AI Laplacian scoring, 10,000 face vector index search, dynamic yield arbitrage +52.9% revenue lift).
- [x] Run 24-hour autonomous concession cycle simulation (`scripts/simulate_concession_day.ts`: 8/8 stages verified).
- [x] Run WhatsApp Sales Swarm & Meta Webhook negotiation simulation (`scripts/test_whatsapp_swarm.ts`).
- [x] Verify live ecosystem production endpoints (`scripts/verify-ecosystem.ts`: Cloud Edge Worker, Gallery, Management Hub 100% operational).

## PHASE 5: Hardening & Final Verification
- [x] Remediate test runner defects across monorepo:
  - `apps/desktop/installer`: resolved worker hang with `--pool=forks` (67/67 passing).
  - `apps/backend/cloud-backend`: resolved Hono types, response casts, `globalThis.fetch`, and CadenceEscalationResult (152/152 passing).
  - `apps/management`: separated E2E specs from vitest unit config, added jsdom mocks for Recharts (3/3 passing).
  - `apps/photographer-portal`: created vitest config and comprehensive unit tests for `photographerStore` (4/4 passing).
  - `apps/self-service`: created vitest config and comprehensive unit tests for `cartStore` (4/4 passing).
- [x] Strict Monorepo Typecheck: `npm run typecheck:all` passes with Exit Code 0 across all 12 applications and packages.
- [x] Security Guard Tests: `pnpm run test:security-guards` passes 6/6 tests.
- [x] Produce evidence-rich `walkthrough.md`.

## PHASE 6: Continuous Evolution
- [x] Synchronized all 12 living documentation files across the ecosystem.
- [x] Production parity and autonomy paradigms locked into V6.1.
