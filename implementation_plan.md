# Antigravity Ultimate Maximal Master Plan (ClickFlash Ecosystem v3.0)

This plan details the full end-to-end execution of the **ANTIGRAVITY ULTIMATE MAXIMAL MASTER PROMPT v3** across the entire ClickFlash monorepo. It establishes total agentic ownership, maximum tooling, enterprise security hardening, Docker-first containerization, automated repository hygiene, and autonomous multi-agent orchestration.

---

## User Review Required

> [!IMPORTANT]
> **GitHub MCP Authentication & Branch Strategy**:
> 1. We identified that the local `gh` CLI is currently authenticated to `github.com` under the active account **`clickflashoffice-spec`** with `repo`, `workflow`, `read:org`, and `gist` scopes. We will configure the workspace GitHub MCP server (`@modelcontextprotocol/server-github`) using this existing authenticated session (`gh auth token`) passed via environment variable so no raw secrets or tokens are ever written to committed files.
> 2. The local branch `main` is currently **10 commits ahead** of `origin/main` with several modified files in `apps/desktop/master` and `apps/management`. As per ClickFlash repository invariants (*Never push directly to main branch*), we propose branching from current HEAD to a dedicated release/hardening branch (e.g. `feat/master-v3-hardening`) before executing remote PR operations.

> [!WARNING]
> **Dependency Security Overrides (4 Critical CVEs, 38 Highs)**:
> `pnpm audit` flagged 4 Critical vulnerabilities (`protobufjs` arbitrary code execution, `vitest` arbitrary file read/execute, and 2 `next` unauthenticated RCEs) plus 38 High vulnerabilities (including `multer` DoS in `apps/desktop/master`).
> In Phase 5, we will resolve these using `pnpm.overrides` in the root `package.json` (`multer: >=2.3.0`, `protobufjs: >=7.5.5`, `vitest: >=3.2.6`, `next: >=15.5.24`) and re-run `pnpm install` and `npm run typecheck:all` to ensure zero API breakages.

---

## Open Questions

> [!NOTE]
> 1. **Docker Compose Environment**: Would you like the Docker Compose configuration to default to running the full multi-service stack (Master Fastify, Management Hub, Touch Kiosk, Gallery, Cloud Backend local emulator, Redis/SQLite) or a lean development profile?
> 2. **Pre-commit Gitleaks hook**: Pre-commit hooks will run `gitleaks detect` and monorepo linting before every commit. Confirm if you'd like pre-commit installed locally via `husky` git hooks immediately.

---

## Proposed Changes

```
ClickFlash Monorepo
├── .agents/
│   ├── mcp_config.json          <-- [NEW] Workspace MCP server configurations
│   ├── rules/                   <-- [NEW/UPDATE] Complete rules system
│   │   ├── tech-stack.md
│   │   ├── coding-standards.md
│   │   ├── testing-policy.md
│   │   ├── security-policy.md
│   │   └── git-policy.md
│   ├── workflows/               <-- [NEW] 8 Comprehensive automated workflows
│   │   ├── feature-start.md
│   │   ├── code-review.md
│   │   ├── security-audit.md
│   │   ├── git-feature-branch.md
│   │   ├── spring-cleaning.md
│   │   ├── architecture-review.md
│   │   ├── mcp-refresh.md
│   │   └── deep-search.md
│   └── agents/                  <-- [NEW] 6 Custom Subagents
│       ├── security-auditor.md
│       ├── backend-implementer.md
│       ├── frontend-implementer.md
│       ├── test-engineer.md
│       ├── devops-git-specialist.md
│       └── orchestrator.md
├── docker-compose.yml           <-- [MODIFY] Production-grade healthchecks & networking
├── .pre-commit-config.yaml      <-- [NEW] Automated hygiene, Gitleaks, EOF, linter
├── package.json                 <-- [MODIFY] pnpm overrides for CVE remediation
├── task.md                      <-- [UPDATE] Living task tracking
├── findings.md                  <-- [UPDATE] Deep intelligence and gap registry
├── progress.md                  <-- [UPDATE] Chronological progress log
├── walkthrough.md               <-- [UPDATE] Verification evidence and proof of work
├── GEMINI.md                    <-- [UPDATE] Antigravity runtime overrides
└── AGENTS.md                    <-- [UPDATE] Canonical monorepo rules
```

---

### Phase 1: Tooling & Maximum MCP Expansion

#### [NEW] [`.agents/mcp_config.json`](file:///c:/Users/alamo/Desktop/ClickFlash/.agents/mcp_config.json)
- Register GitHub MCP (`@modelcontextprotocol/server-github`) referencing `clickflashoffice-spec` OAuth token.
- Register Sequential Thinking MCP (`@modelcontextprotocol/server-sequential-thinking`).
- Register SQLite Explorer MCP (`@modelcontextprotocol/server-sqlite`) pointing to `apps/desktop/master/backend/data/` databases.
- Register Filesystem MCP (`@modelcontextprotocol/server-filesystem`) scoped strictly to `c:\Users\alamo\Desktop\ClickFlash`.

---

### Phase 2: Comprehensive Multi-Dimensional Audits

#### [NEW] [`docs/audits/AUDIT_ARCHITECTURE_V3.md`](file:///c:/Users/alamo/Desktop/ClickFlash/docs/audits/AUDIT_ARCHITECTURE_V3.md)
- Complete architectural diagram of data flow: Edge cameras $\rightarrow$ USB PTP / SD Card $\rightarrow$ Fastify Master $\rightarrow$ Ingestion Studio $\rightarrow$ Biometric Face Vector DB $\rightarrow$ Guest Kiosk / Gallery $\rightarrow$ Dynamic Yield Pricing Engine.
- Analysis of single points of failure, event loop starvation risks, and SQLite WAL concurrency.

#### [NEW] [`docs/audits/AUDIT_SECURITY_CVE_V3.md`](file:///c:/Users/alamo/Desktop/ClickFlash/docs/audits/AUDIT_SECURITY_CVE_V3.md)
- Complete CVE inventory with severity, CWE, impact, reproduction vector, and exact fix for all 4 Criticals and 38 Highs.

#### [NEW] [`docs/audits/AUDIT_CODE_QUALITY_V3.md`](file:///c:/Users/alamo/Desktop/ClickFlash/docs/audits/AUDIT_CODE_QUALITY_V3.md)
- Monorepo boundaries, circular dependencies, bundle sizes, and dead code report.

---

### Phase 3: Foundation Installation & Structure

#### [NEW] [`.pre-commit-config.yaml`](file:///c:/Users/alamo/Desktop/ClickFlash/.pre-commit-config.yaml)
- Pre-commit hooks for Gitleaks, trailing whitespace removal, end-of-file fixer, YAML validator, and `npm run lint:all`.

#### [MODIFY] [`docker-compose.yml`](file:///c:/Users/alamo/Desktop/ClickFlash/docker-compose.yml)
- Update Docker Compose with explicit container healthchecks, isolated bridge networks, and volume definitions for edge SQLite persistence and cloud emulation.

#### [NEW] [`.agents/rules/`](file:///c:/Users/alamo/Desktop/ClickFlash/.agents/rules/)
- Author dedicated modular policy files:
  - `tech-stack.md`: Explicit package versions, Node 22 / React 19 / Fastify / Electron 39 guidelines.
  - `coding-standards.md`: TypeScript strict mode, Zod validation, error envelope conventions.
  - `testing-policy.md`: Vitest, Playwright e2e, 100% typecheck invariant.
  - `security-policy.md`: Zero secret commitment, biometric data air-gapping, HMAC verification.
  - `git-policy.md`: Conventional commits, PR branching, protection rules.

#### [NEW] [`.agents/workflows/`](file:///c:/Users/alamo/Desktop/ClickFlash/.agents/workflows/)
- Implement 8 production workflows with YAML metadata and actionable steps:
  - `feature-start.md`
  - `code-review.md`
  - `security-audit.md`
  - `git-feature-branch.md`
  - `spring-cleaning.md`
  - `architecture-review.md`
  - `mcp-refresh.md`
  - `deep-search.md`

#### [NEW] [`.agents/agents/`](file:///c:/Users/alamo/Desktop/ClickFlash/.agents/agents/)
- Implement 6 specialized Subagents with defined tools, model preferences, and execution policies:
  - `security-auditor.md`
  - `backend-implementer.md`
  - `frontend-implementer.md`
  - `test-engineer.md`
  - `devops-git-specialist.md`
  - `orchestrator.md`

---

### Phase 4: Git Excellence & Remote Integration

#### [NEW] [`scripts/git_hygiene.ps1`](file:///c:/Users/alamo/Desktop/ClickFlash/scripts/git_hygiene.ps1)
- Automated PowerShell script to enforce branch validation, run pre-commit checks, verify commit message formatting against Conventional Commits, and create PRs via `gh pr create` or GitHub MCP.

---

### Phase 5: Hardening, Remediation & Verification

#### [MODIFY] [`package.json`](file:///c:/Users/alamo/Desktop/ClickFlash/package.json)
- Add targeted pnpm overrides:
  ```json
  "pnpm": {
    "overrides": {
      "multer": ">=2.3.0",
      "protobufjs": ">=7.5.5",
      "vitest": ">=3.2.6"
    }
  }
  ```
- Re-run `pnpm install` and verify resolution of high/critical advisories.

---

## Verification Plan

### Automated Verification
1. **TypeScript Typecheck**:
   - Command: `npm run typecheck:all`
   - Target: Exit code 0, 0 compilation errors across all 14 apps and 11 packages.
2. **Targeted Unit Tests**:
   - Command: `pnpm --filter clickflash-master test`
   - Command: `pnpm --filter clickflash-touch test`
   - Command: `pnpm --filter @clickflash/ai-core test`
   - Target: 100% passing tests.
3. **Dependency Vulnerability Verification**:
   - Command: `pnpm audit --json`
   - Target: 0 Critical vulnerabilities, reduction of High vulnerabilities.
4. **Linting Verification**:
   - Command: `npm run lint:all`
5. **Docker Build Verification**:
   - Command: `docker compose config` and container build dry-run.

### Manual Verification
1. Inspect generated `.agents/` rules, workflows, agents, and MCP configurations.
2. Review `walkthrough.md` proof of work, test outputs, and security remediation diffs.
