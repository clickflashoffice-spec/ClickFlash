# Antigravity V6 High-Level Implementation Plan

## Goal Description
Evolve the ClickFlash Ecosystem to V6 through exhaustive app-wide testing, aggressive agentic sweeps, and a controlled "Production Takeover" simulation on the local machine to guarantee zero-defect, self-healing operation.

## Phase 1: Tooling & Hooks Maximation
- [ ] Write a new 	est-every-app workflow using the laeddine-mcp tools.
- [ ] Define custom specialized subagents in .agents/agents/ specifically for Chaos Engineering and Load Testing.

## Phase 2: Ultra-Deep Scans & E2E Verification
- [ ] Spawn parallel subagent swarms:
  - **E2E Architect**: Writes Playwright specs for pps/management and pps/gallery.
  - **Chaos Monkey**: Writes local toxic proxy scripts to sever WebSocket/SQLite connections.
  - **Load Tester**: Writes k6 scripts for the Master OS fastify server.
- [ ] Subagents will push all uncovered flaws into improvements_backlog.md.

## Phase 3: CI/CD & Observability Setup
- [ ] Enhance .github/workflows/ci.yml to automatically reject PRs if test coverage drops below 90% across any of the 14 apps.
- [ ] Integrate local OpenTelemetry (Prometheus/Grafana docker-compose) to observe the system during the Phase 4 simulation.

## Phase 4: Controlled Production Takeover (REQUIRES APPROVAL)
- [ ] Use scripts/git/spawn-worktree.ps1 to create an isolated prod-sim environment.
- [ ] Execute docker-compose.prod-sim.yml.
- [ ] Fire the Load Testing and Chaos Engineering scripts.
- [ ] Verify the auto-healing loops (e.g., Kiosks buffering to IndexedDB when network drops, D1 syncing when it restores).

## Phase 5: Hardening
- [ ] Agents consume the results of Phase 4 and systematically rewrite vulnerable code using maximum coding skills.

## Verification Plan
### Automated Tests
- pnpm test:all across the monorepo.
- 
px playwright test for all UI packages.
- k6 run scripts/load/master-burst.js.

### User Review Required
> [!CAUTION]
> Phase 4 involves running aggressive load tests and spinning up multiple containers locally. This requires explicit user consent (The Production Takeover Safety Gate).
