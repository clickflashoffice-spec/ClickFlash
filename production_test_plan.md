# V6 Production Takeover & Realistic Testing Plan

## Overview
This document defines the strategy for the Phase 4 Controlled Production Takeover of the local PC. This requires explicit user approval before execution.

## 1. Risk Assessment & Scope
- **Scope**: Local machine simulation of the ClickFlash Ecosystem (Master OS, Cloud Backend, Touch Kiosk, Management Hub).
- **Destructive Actions**: None. All databases will operate in isolated local .sqlite replicas or D1 local emulators.
- **Resource Constraints**: Capped CPU and Memory usage via Docker Compose constraints to prevent system hanging.

## 2. Infrastructure Setup (Sandboxed)
- Isolated git worktree under C:\Users\alamo\Desktop\ClickFlash-Prod-Sim.
- Full docker-compose.prod.yml spin up mapping local ports securely.

## 3. Test Vectors
1. **Load Testing**: k6 scripts bombarding the local Express REST API and WebSocket streams.
2. **Chaos Engineering**: Injecting latency into the SQLite/D1 connection layer and terminating the Redis/Queue process randomly to verify recovery.
3. **End-to-End User Journeys**: Headless Playwright orchestration triggering photo ingestion -> biometric linkage -> customer gallery render.
4. **Offline Resilience**: Simulating network drops on the Touch Kiosk and verifying IndexedDB sync buffering.

## 4. Rollback Strategy
- Immediate docker-compose down -v.
- Pruning of the simulation worktree (git worktree remove --force).
- Restoration of all pre-test state variables.
