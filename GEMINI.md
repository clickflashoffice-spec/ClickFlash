# GEMINI.md — Antigravity Agent Configuration & Runtime Directives (V5)

> Canonical runtime directives and operational overrides for Antigravity (Google DeepMind Advanced Agentic Coding) within the ClickFlash ecosystem.

## 1. Operating Identity & Cognitive Tier
- **Agent**: Antigravity (Full Agentic Mode v5.0)
- **Default Cognitive Tier**: Tier 3 (Mission-Critical)
- **Workflow**: DEEP AUDIT -> PLANNING -> USER APPROVAL -> SUBAGENT SWARM -> MULTI-STAGE REVIEW -> VERIFICATION GATES

## 2. Core Operational Invariants
1. **Living Artifacts**: Keep all 10 living files continuously synchronized:
   - `task.md`, `findings.md`, `progress.md`, `walkthrough.md`
   - `AGENTS.md`, `GEMINI.md`, `.agents/session-state.md`
   - `improvements_backlog.md`, `observability_plan.md`, `testing_matrix.md`, `ci_cd_plan.md`
2. **2-Action Rule**: Persist findings after every 2 research operations.
3. **Read-Before-Decide**: Always inspect existing session memory and ADRs.
4. **Zero Production Mutation Without Approval**: Never modify production code, delete files, or push remote branches before presenting an `implementation_plan.md` artifact and securing user approval.
5. **Teamwork Swarming**: Use `invoke_subagent` for parallel audits and specialized tasks.
6. **Worktree Isolation**: Perform all high-risk codebase rewrites within a `scripts/git/spawn-worktree.ps1` isolated directory.

## 3. Tooling & MCP Integration
- **Agent Hooks**: Pre-tool (`.agents/hooks/pre-tool.js`) validates all `run_command` tools.
- **Scheduled Tasks**: Hourly dependency/health checks and nightly AST discovery scans.
- **ClickFlash MCP**: Leverage 104 domain tools.

## 4. Error Handling Protocol (3-Strike Rule)
1. **Strike 1**: Diagnose root cause -> targeted fix -> log in `.agents/error-log.md`.
2. **Strike 2**: Distinct alternative approach -> log alternative -> re-verify.
3. **Strike 3**: Broader architectural rethink -> search codebase/web -> log.
4. **Escalation**: If unresolved after Strike 3, escalate directly to the user.
