# ClickFlash — Session Memory Index

> Living context document. Update after significant architectural changes or decisions.
> Last updated: 2026-05-06

---

## Active State

**Post-audit health: 7.9/10** | **Branch**: `main` (1c1486f)

### Open Deferred Items
| ID | Item | Priority |
|----|------|----------|
| DEF-1 | Touch: cart + checkout test coverage | Medium |
| DEF-2 | Management: HR/payroll route test coverage | Medium |
| DEF-3 | httpOnly cookie migration (gallery + management) | High — security |

### Known Config Note
`apps/gallery/backend/wrangler.toml` and `apps/management/backend/wrangler.toml` both contain
`clicketflash.com` (extra 'e') in `ALLOWED_ORIGINS`. Verify if legacy domain or typo before changing.

---

## Active Worktrees (`.claude/worktrees/`)

| Worktree | Status |
|----------|--------|
| `adoring-bassi-ff2552` | Active |
| `laughing-blackwell-f03c04` | Active |
| `peaceful-hawking-8e536b` | Active |
| `priceless-clarke` | Run `git worktree list` to verify branch |

Also present: `.kilo/worktrees/` — non-Claude worktrees, ignore.

---

## Port Map

| Port | Service |
|------|---------|
| 8090 | Master backend (Express + WebSocket) |
| 8091 | Touch backend (Express + WebSocket) |
| 5173 | Master Vite dev |
| 5174 | Touch Vite dev |
| 5175 | Management Vite dev |
| 5176 | Gallery Vite dev |
| 3000 | Website (Next.js) |
| 8787 | Management CF Worker local (wrangler dev) |

---

## Architecture Decisions (ADRs)

### ADR-001: JWT library by runtime
- **CF Workers**: `jose.jwtVerify()` — Node crypto not available in CF Workers runtime
- **Node/Electron**: `jsonwebtoken` acceptable
- Files: `apps/gallery/backend/src/jwt.ts`, `apps/gallery/backend/src/tenantIsolation.ts`

### ADR-002: Secrets storage per runtime
- CF Workers → `wrangler secret put`
- Electron → `getOrCreateSecret()` persisting to `pb_data/secrets.json`
- CI → GitHub Actions secrets → env vars
- File: `apps/master/backend/config/constants.ts`

### ADR-003: Chart library consolidation
- Recharts only — Chart.js and Victory removed in audit MED-2
- Files: `apps/management/src/`

### ADR-004: Auth token storage
- `sessionStorage` (upgraded from `localStorage` in audit HIGH-1)
- httpOnly cookie migration is DEF-3 (pending)
- Files: `apps/gallery/src/services/pb.ts`, `apps/management/src/services/pb.ts`

### ADR-005: Electron single-port design
- All traffic (UI + API + WS) on one port: 8090 (master) / 8091 (touch)
- Frontend loads from `http://localhost:<port>`, not `file://`
- Files: `apps/master/electron-main.js`, `apps/touch/main.js`

---

## Common Patterns (file references)

| Pattern | File |
|---------|------|
| JWT validation | `apps/gallery/backend/src/tenantIsolation.ts` |
| D1-backed rate limiter | `apps/gallery/backend/src/loginRateLimiter.ts` |
| React Query config | `apps/gallery/src/main.tsx` |
| ErrorBoundary | `apps/master/src/main.tsx` |
| Vite chunk splitting | `apps/gallery/vite.config.ts` |
| Secret generation | `apps/master/backend/config/constants.ts` |
| Env config templates | `apps/master/configs/` (club.env, concorde.env, occidental.env) |

---

## Environment Notes

- **Windows machine** — shell scripts use Git Bash (`bash`) or PowerShell (`pwsh`)
- **pnpm workspaces** configured but root scripts use `npm --prefix` pattern
- **`npx tsx`** required in all npm scripts (bare `tsx` fails on Windows with `--prefix`)
- **husky** commit-msg hook enforces `type(scope): description` format
- **Auto-commit**: Stop hook in `.claude/settings.json` commits and pushes at session end
