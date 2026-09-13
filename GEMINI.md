# GEMINI.md — Antigravity Agent Configuration & Runtime Directives

> Canonical runtime directives and operational overrides for Antigravity (Google DeepMind Advanced Agentic Coding) within the ClickFlash ecosystem.

## 1. Operating Identity & Cognitive Tier
- **Agent**: Antigravity (Full Agentic Mode v2.0)
- **Default Cognitive Tier**: Tier 3 (Mission-Critical)
- **Workflow**: PLANNING $\rightarrow$ USER APPROVAL $\rightarrow$ EXECUTION $\rightarrow$ MULTI-STAGE REVIEW $\rightarrow$ VERIFICATION GATES

## 2. Core Operational Invariants
1. **Living Artifacts**: Keep all 7 living files continuously synchronized:
   - [`task.md`](file:///c:/Users/alamo/Desktop/ClickFlash/task.md)
   - [`findings.md`](file:///c:/Users/alamo/Desktop/ClickFlash/findings.md)
   - [`progress.md`](file:///c:/Users/alamo/Desktop/ClickFlash/progress.md)
   - [`walkthrough.md`](file:///c:/Users/alamo/Desktop/ClickFlash/walkthrough.md)
   - [`AGENTS.md`](file:///c:/Users/alamo/Desktop/ClickFlash/AGENTS.md)
   - [`GEMINI.md`](file:///c:/Users/alamo/Desktop/ClickFlash/GEMINI.md)
   - [`.agents/session-state.md`](file:///c:/Users/alamo/Desktop/ClickFlash/.agents/session-state.md)
2. **2-Action Rule**: Persist findings to `.agents/context-snapshot.md` and `.agents/session-state.md` after every 2 research operations.
3. **Read-Before-Decide**: Always inspect existing session memory, ADRs, and error logs before executing major decisions or architectural refactors.
4. **Zero Production Mutation Without Approval**: Never modify production code, delete files, or push to remote branches before presenting an `implementation_plan.md` artifact and securing explicit user approval.
5. **Verification Cycle**: Non-negotiable sequence after any code change:
   - `npm run typecheck:all` (must return Exit code 0 with 0 errors)
   - Targeted unit tests (`pnpm --filter <app-name> test`)
   - Monorepo lint (`npm run lint:all`)

## 3. MCP Integration Protocols
- **ClickFlash MCP**: Leverage 104 domain tools (`monorepo_health_score`, `scan_security`, `deep_scan_architecture`, `dynamic_yield_arbitrage_engine`, `synthetic_park_simulator`).
- **Alaeddine MCP**: Proactively query internal AST, command definitions, bundle metrics, and system services.
- **GitHub MCP**: Use `@modelcontextprotocol/server-github` for remote pull requests, branch management, issue tracking, and commit authoring.
- **Chrome DevTools MCP**: Execute headless UI audits, DOM verification, and performance traces for touch kiosk and management hub interfaces.

## 4. Error Handling Protocol (3-Strike Rule)
1. **Strike 1**: Diagnose root cause $\rightarrow$ targeted fix $\rightarrow$ log in `.agents/error-log.md`.
2. **Strike 2**: Distinct alternative approach $\rightarrow$ log alternative $\rightarrow$ re-verify.
3. **Strike 3**: Broader architectural rethink $\rightarrow$ search codebase/web $\rightarrow$ log.
4. **Escalation**: If unresolved after Strike 3, escalate directly to the user with complete context and reproductive steps.
