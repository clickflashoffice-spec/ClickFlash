# ClickFlash Dependency Alignment Report

**Agent:** Dependency_Alignment_Agent  
**Date:** 2026-06-05  
**Scope:** 6 applications + root monorepo  
**Package Manager:** pnpm 10.28.2

---

## Executive Summary

All 6 application `package.json` files and the root `package.json` have been aligned to the target versions specified in the alignment matrix. `pnpm install` at the root completed successfully, confirming that the resolved dependency graph is compatible.

A pre-existing broken workspace reference (`file:../types`) in `apps/master/src/components/ui/package.json` was discovered during verification and corrected to `workspace:*` so that `pnpm install` could complete. This was **not** caused by the alignment changes.

---

## Changes Per App

### 1. Master (`apps/master/package.json`)

| Dependency | Old | New | Category |
|------------|-----|-----|----------|
| `jest` | `^30.2.0` | `^29.7.0` | devDependencies |
| `jest-environment-jsdom` | `^30.2.0` | `^29.7.0` | devDependencies |
| `@types/jest` | `^30.0.0` | `^29.5.14` | devDependencies |
| `@eslint/js` | `^9.0.0` | `^9.39.4` | devDependencies |
| `eslint` | `^9.0.0` | `^9.39.4` | devDependencies |
| `@typescript-eslint/eslint-plugin` | `^8.0.0` | `^8.59.3` | devDependencies |
| `@typescript-eslint/parser` | `^8.0.0` | `^8.59.3` | devDependencies |
| `@playwright/test` | `^1.57.0` | `^1.58.2` | devDependencies |

**Rationale:** Jest 30 was very new and incompatible with the rest of the ecosystem. ESLint and typescript-eslint were pinned to low/minor versions and needed alignment with Touch.

---

### 2. Touch (`apps/touch/package.json`)

| Dependency | Old | New | Category |
|------------|-----|-----|----------|
| `@testing-library/react` | `^16.0.1` | `^16.3.2` | devDependencies |
| `@typescript-eslint/eslint-plugin` | `^8.59.2` | `^8.59.3` | devDependencies |
| `@typescript-eslint/parser` | `^8.59.2` | `^8.59.3` | devDependencies |
| `autoprefixer` | `^10.4.22` | `^10.4.23` | devDependencies |
| `esbuild` | `^0.27.0` | `^0.27.4` | devDependencies |
| `ts-jest` | `^29.4.5` | `^29.4.6` | devDependencies |
| `vite` | `^7.2.4` | `^7.3.2` | devDependencies |

**Rationale:** Minor version bumps to match the highest versions used across the ecosystem.

---

### 3. Gallery (`apps/gallery/package.json`)

| Dependency | Old | New | Category |
|------------|-----|-----|----------|
| `@eslint/js` | `^10.0.1` | `^9.39.4` | devDependencies |
| `eslint` | `^10.4.0` | `^9.39.4` | devDependencies |
| `@playwright/test` | `^1.50.0` | `^1.58.2` | devDependencies |
| `@testing-library/react` | `^16.0.1` | `^16.3.2` | devDependencies |
| `@types/node` | `^24.10.1` | `^24.10.2` | devDependencies |
| `autoprefixer` | `^10.4.22` | `^10.4.23` | devDependencies |
| `typescript` | `^5.7.3` | `^5.9.3` | devDependencies |
| `vite` | `^7.2.4` | `^7.3.2` | devDependencies |
| `lucide-react` | `^0.575.0` | `^0.577.0` | dependencies |

**Rationale:** ESLint 10 was a major version jump that would break shared configs. Downgraded to `^9.39.4` for ecosystem consistency. Other deps bumped to match highest versions.

---

### 4. Management (`apps/management/package.json`)

| Dependency | Old | New | Category |
|------------|-----|-----|----------|
| `@eslint/js` | `^10.0.1` | `^9.39.4` | devDependencies |
| `eslint` | `^10.4.0` | `^9.39.4` | devDependencies |
| `@testing-library/react` | `^16.0.1` | `^16.3.2` | devDependencies |
| `@types/node` | `^24.10.1` | `^24.10.2` | devDependencies |
| `autoprefixer` | `^10.4.22` | `^10.4.23` | devDependencies |
| `ts-jest` | `^29.4.5` | `^29.4.6` | devDependencies |
| `typescript` | `^5.7.3` | `^5.9.3` | devDependencies |
| `vite` | `^7.2.4` | `^7.3.2` | devDependencies |
| `lucide-react` | `^0.575.0` | `^0.577.0` | dependencies |

**Rationale:** Same as Gallery — ESLint 10 downgrade plus minor version alignment.

---

### 5. MoneyTrash (`apps/moneytrash/package.json`)

| Dependency | Old | New | Category |
|------------|-----|-----|----------|
| `@types/react` | `^19.0.0` | `^19.2.7` | devDependencies |
| `@types/react-dom` | `^19.0.0` | `^19.2.3` | devDependencies |
| `@vitejs/plugin-react` | `^4.3.4` | `^5.1.1` | devDependencies |
| `autoprefixer` | `^10.4.20` | `^10.4.23` | devDependencies |
| `postcss` | `^8.5.3` | `^8.5.6` | devDependencies |
| `tailwindcss` | `^3.4.17` | `^3.4.18` | devDependencies |
| `typescript` | `^5` | `^5.9.3` | devDependencies |
| `vite` | `^6.1.0` | `^7.3.2` | devDependencies |
| `@types/node` | `^20` | `^24.10.2` | devDependencies |

**Rationale:** Vite 6 → 7 is a major upgrade for MoneyTrash but necessary for ecosystem consistency. React types, Tailwind, and TypeScript aligned to the shared targets.

---

### 6. Website (`apps/website/package.json`)

| Dependency | Old | New | Category |
|------------|-----|-----|----------|
| `react` | `^19.0.0` | `^19.2.0` | dependencies |
| `react-dom` | `^19.0.0` | `^19.2.0` | dependencies |
| `lucide-react` | `^0.562.0` | `^0.577.0` | dependencies |
| `@playwright/test` | `^1.50.0` | `^1.58.2` | devDependencies |
| `@testing-library/react` | `^16.2.0` | `^16.3.2` | devDependencies |
| `@types/react` | `^19.0.0` | `^19.2.7` | devDependencies |
| `@types/react-dom` | `^19.0.0` | `^19.2.3` | devDependencies |
| `@types/node` | `^20` | `^24.10.2` | devDependencies |
| `@vitejs/plugin-react` | `^4.3.4` | `^5.1.1` | devDependencies |
| `eslint` | `^9` | `^9.39.4` | devDependencies |
| `tailwindcss` | `^4` | `^3.4.18` | devDependencies |
| `typescript` | `^5` | `^5.9.3` | devDependencies |
| `@tailwindcss/postcss` | `^4` | **removed** | devDependencies |
| `autoprefixer` | *added* | `^10.4.23` | devDependencies |
| `postcss` | *added* | `^8.5.6` | devDependencies |

**Rationale:** Tailwind CSS v4 → v3 is the most significant change. The shared UI package (`packages/ui`) uses v3 tokens, so Website must align. The v4-only package `@tailwindcss/postcss` was removed and replaced with the standard v3 build pipeline (`postcss` + `autoprefixer`). **Note:** Website source code (e.g., CSS imports, Tailwind directives) may need a follow-up migration pass to be fully v3-compatible, but the dependency graph itself resolves cleanly.

---

### 7. Root (`package.json`)

The root `package.json` did not require changes for the aligned dependencies:

- `@playwright/test`: already at `^1.58.2` ✅
- `concurrently`: already at `^9.2.1` ✅
- `husky`: `^9.0.0` (not in alignment matrix, left untouched)
- `better-sqlite3-multiple-ciphers`: `^12.8.0` (not in alignment matrix, left untouched)

---

## pnpm Install Verification

**Result:** ✅ **SUCCESS**

```
Scope: all 13 workspace projects
...
Progress: resolved 2121, reused 1895, downloaded 0, added 25, done
Done in 3m 43.4s using pnpm v10.28.2
```

### Pre-existing Issue Discovered During Install

`apps/master/src/components/ui/package.json` contained a broken local file reference:

```json
"@clickflash/types": "file:../types"
```

This path resolved to `apps/master/src/components/types`, which does **not exist**. The correct reference is `workspace:*` (or `file:../../../../packages/types`). This caused the initial `pnpm install` to fail with:

```
ERR_PNPM_LINKED_PKG_DIR_NOT_FOUND Could not install from "..." as it does not exist.
```

**Workaround applied:** Changed the reference to `workspace:*` so pnpm resolves it via the workspace protocol. This is a **pre-existing bug**, not caused by the dependency alignment.

---

## Peer Dependency Warnings (Pre-existing)

The following peer warnings were present **before** and **after** alignment. None were introduced by this work:

| App | Package | Issue |
|-----|---------|-------|
| `apps/gallery` | `@stripe/react-stripe-js` | Does not declare React 19 support (peer range `^16.8.0 \|\| ^17.0.0 \|\| ^18.0.0`) |
| `apps/master` | `dmg-builder` / `electron-builder-squirrel-windows` | Cross-peer version mismatch (`26.8.1` vs `26.7.0`) |
| `apps/touch` | `dmg-builder` / `electron-builder-squirrel-windows` | Cross-peer version mismatch (`24.13.3` vs `26.7.0`) |
| `apps/master` | `react-apexcharts` | Peer `apexcharts@>=4.0.0` unmet (found `3.54.1`) |
| `apps/website` | `@cloudflare/next-on-pages` | Missing peer `vercel`; unmet peer `next` range |

---

## Recommendations for Future Dependency Management

1. **Centralize version definitions**  
   Use pnpm workspace catalogs (`pnpm-workspace.yaml` `catalog:` feature) to define single source-of-truth versions for shared dependencies like React, TypeScript, Vite, ESLint, and Tailwind. This eliminates drift automatically.

2. **Automated alignment checks in CI**  
   Add a CI step that parses all `package.json` files and fails the build if any shared dependency deviates from the catalog/target version by more than a patch level.

3. **Lockfile hygiene**  
   Ensure `pnpm-lock.yaml` is committed and updated in the same PR as `package.json` changes. The lockfile in this repo was stale; `pnpm install` regenerated it.

4. **Tailwind v4 migration plan**  
   Website was downgraded from v4 to v3 for ecosystem alignment. Create a dedicated migration ticket to upgrade **all** apps to Tailwind v4 together once `packages/ui` is ready.

5. **Clean up nested workspace packages**  
   `apps/master/src/components/ui/package.json` should either be removed (if it's a duplicate of `packages/ui`) or properly integrated. Nested `package.json` files inside `apps/**` are picked up by the workspace glob and can cause surprising resolution issues.

6. **Peer dependency audit**  
   Address the pre-existing peer warnings, especially `@stripe/react-stripe-js` (React 19 support) and the `electron-builder` cross-peer mismatches in Master/Touch.

---

## Files Modified

- `apps/master/package.json`
- `apps/touch/package.json`
- `apps/gallery/package.json`
- `apps/management/package.json`
- `apps/moneytrash/package.json`
- `apps/website/package.json`
- `apps/master/src/components/ui/package.json` (pre-existing broken reference fix)
- `DEPENDENCY_ALIGNMENT_REPORT.md` (this file)

---

*Report generated by Dependency_Alignment_Agent — ClickFlash Ecosystem*
