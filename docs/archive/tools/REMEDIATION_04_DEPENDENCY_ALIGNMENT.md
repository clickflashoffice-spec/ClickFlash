# ClickFlash — Dependency Alignment Execution Plan
> **Generated:** June 2026  
> **Priority:** P2 (security-sensitive deps = P1)  
> **Scope:** All apps and shared packages

---

## 1. Current State

- **90 unique production dependencies**
- **77 unique dev dependencies**
- **13 production dependencies with version mismatches**
- **10 dev dependencies with version mismatches**
- **5 packages used as both prod and dev**

### Critical Mismatches

| Package | Current Versions | Target Version | Reason |
|---------|------------------|----------------|--------|
| `lucide-react` | `^0.577.0` / `^0.562.0` | `^0.577.0` | Latest stable |
| `@sentry/react` | `^10.39.0` / `^10.48.0` | `^10.48.0` | Bug fixes |
| `@sentry/node` | `^10.46.0` / `^10.48.0` | `^10.48.0` | Bug fixes |
| `express` | `^5.1.0` / `^5.2.1` | `^5.2.1` | Security patches |
| `sharp` | `^0.33.2` / `^0.34.5` | `^0.34.5` | Performance + security |
| `uuid` | `^10.0.0` / `^11.0.3` | `^11.0.3` | Latest |
| `react-router-dom` | `^6.22.3` / `^7.9.6` | `^7.9.6` | Latest major |
| `electron-builder` | `^26.8.1` / `24.13.3` | `^26.8.1` | Consistency |

### Security-Sensitive Packages Requiring Pinning
- `bcrypt` / `bcryptjs` — password hashing
- `jsonwebtoken` / `jose` — JWT handling
- `helmet` — security headers
- `better-sqlite3-multiple-ciphers` — encrypted SQLite
- `stripe` — payments
- `sharp` — image processing (C++ native)

---

## 2. Implementation Steps

### Step 1 — Adopt pnpm Catalog (Day 1)
In root `package.json`, add:
```json
{
  "pnpm": {
    "catalogs": {
      "default": {
        "react": "^19.0.0",
        "react-dom": "^19.0.0",
        "typescript": "^5.9.3",
        "lucide-react": "^0.577.0",
        "@sentry/react": "^10.48.0",
        "@sentry/node": "^10.48.0",
        "express": "^5.2.1",
        "sharp": "^0.34.5",
        "uuid": "^11.0.3",
        "zustand": "^5.0.12",
        "zod": "^3.25.0",
        "tailwindcss": "^4.0.0",
        "eslint": "^9.39.4",
        "@playwright/test": "^1.58.2"
      }
    }
  }
}
```

In each app's `package.json`, replace versions with `catalog:`:
```json
{
  "dependencies": {
    "react": "catalog:"
  }
}
```

### Step 2 — Security Dependency Pin (Day 2)
Add `pnpm.overrides` for security-sensitive packages:
```json
{
  "pnpm": {
    "overrides": {
      "jsonwebtoken": "^9.0.3",
      "bcryptjs": "^3.0.0",
      "helmet": "^8.2.0",
      "express": "^5.2.1"
    }
  }
}
```

### Step 3 — Audit and Update (Day 3)
```bash
# Run from repo root
pnpm audit --prod
pnpm outdated -r
pnpm update -r
```

### Step 4 — Verify Builds (Days 4–5)
```bash
pnpm install
pnpm -r run typecheck
pnpm -r run build
pnpm -r run test:ci
```

### Step 5 — CI Enforcement (Day 6)
Add to GitHub Actions:
```yaml
- name: Dependency Audit
  run: pnpm audit --prod --audit-level high
- name: Check Catalog Usage
  run: pnpm exec syncpack list-mismatches
```

---

## 3. Verification Checklist

- [ ] `pnpm catalog` adopted in root `package.json`
- [ ] All security-sensitive packages pinned via `overrides`
- [ ] `pnpm audit --prod` returns 0 high/critical
- [ ] All apps build successfully
- [ ] All tests pass
- [ ] CI enforces audit and catalog compliance

---

## 4. Timeline

| Step | Duration |
|------|----------|
| Catalog setup | 1 day |
| Security pinning | 1 day |
| Audit/update | 1 day |
| Build verification | 2 days |
| CI enforcement | 1 day |
| **Total** | **6 days** |
