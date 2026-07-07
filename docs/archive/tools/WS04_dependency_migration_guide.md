# Dependency Alignment Migration Guide

## Step 1 — Root package.json already updated
pnpm catalog and overrides have been applied to root package.json.

## Step 2 — Update each app's package.json
Replace version numbers with `catalog:` for packages in the catalog.

### Example diff for an app package.json:
```diff
-    "react": "^18.2.0",
+    "react": "catalog:",
-    "typescript": "^5.7.0",
+    "typescript": "catalog:",
```

## Step 3 — Run install and verify
```bash
pnpm install
pnpm audit --prod
pnpm -r run typecheck
pnpm -r run build
pnpm -r run test:ci
```

## Per-App Recommendations

### gallery
File: `apps/gallery/package.json`

**dependencies:**
- `@sentry/react`: `^10.39.0` → `catalog:`
- `@tanstack/react-query`: `^5.90.10` → `catalog:`
- `bcryptjs`: `^2.4.3` → `catalog:`
- `clsx`: `^2.1.1` → `catalog:`
- `cors`: `^2.8.6` → `catalog:`
- `date-fns`: `^4.1.0` → `catalog:`
- `dexie`: `^4.3.0` → `catalog:`
- `express`: `^5.2.1` → `catalog:`
- `formidable`: `2.1.5` → `catalog:`
- `helmet`: `^8.1.0` → `catalog:`
- `jsonwebtoken`: `^9.0.2` → `catalog:`
- `lucide-react`: `^0.577.0` → `catalog:`
- `react`: `^19.2.0` → `catalog:`
- `react-dom`: `^19.2.0` → `catalog:`
- `tailwind-merge`: `^3.4.0` → `catalog:`
- `zod`: `^4.1.13` → `catalog:`
- `zustand`: `^5.0.0` → `catalog:`

**devDependencies:**
- `@playwright/test`: `^1.58.2` → `catalog:`
- `@testing-library/jest-dom`: `^6.9.1` → `catalog:`
- `@testing-library/react`: `^16.3.2` → `catalog:`
- `@types/react`: `^19.2.7` → `catalog:`
- `@types/react-dom`: `^19.2.3` → `catalog:`
- `@vitejs/plugin-react`: `^5.1.1` → `catalog:`
- `eslint`: `^9.39.4` → `catalog:`
- `jest`: `^29.7.0` → `catalog:`
- `tailwindcss`: `^3.4.18` → `catalog:`
- `ts-jest`: `^29.4.6` → `catalog:`
- `typescript`: `^5.9.3` → `catalog:`
- `vite`: `^7.3.2` → `catalog:`

### installer
File: `apps/installer/package.json`

**dependencies:**
- `clsx`: `^2.1.1` → `catalog:`
- `lucide-react`: `^0.562.0` → `catalog:`
- `react`: `^19.2.0` → `catalog:`
- `react-dom`: `^19.2.0` → `catalog:`
- `tailwind-merge`: `^3.4.0` → `catalog:`

**devDependencies:**
- `@types/react`: `^19.2.7` → `catalog:`
- `@types/react-dom`: `^19.2.3` → `catalog:`
- `@vitejs/plugin-react`: `^5.1.1` → `catalog:`
- `tailwindcss`: `^3.4.18` → `catalog:`
- `typescript`: `^5.9.3` → `catalog:`
- `vite`: `^7.3.2` → `catalog:`

### management
File: `apps/management/package.json`

**dependencies:**
- `@sentry/react`: `^10.39.0` → `catalog:`
- `@tanstack/react-query`: `^5.90.10` → `catalog:`
- `clsx`: `^2.1.1` → `catalog:`
- `date-fns`: `^4.1.0` → `catalog:`
- `dexie`: `^4.3.0` → `catalog:`
- `formidable`: `2.1.5` → `catalog:`
- `jsonwebtoken`: `^9.0.2` → `catalog:`
- `lucide-react`: `^0.577.0` → `catalog:`
- `react`: `^19.2.0` → `catalog:`
- `react-dom`: `^19.2.0` → `catalog:`
- `tailwind-merge`: `^3.4.0` → `catalog:`
- `zod`: `^4.1.13` → `catalog:`

**devDependencies:**
- `@playwright/test`: `^1.58.2` → `catalog:`
- `@testing-library/jest-dom`: `^6.9.1` → `catalog:`
- `@testing-library/react`: `^16.3.2` → `catalog:`
- `@types/react`: `^19.2.7` → `catalog:`
- `@types/react-dom`: `^19.2.3` → `catalog:`
- `@vitejs/plugin-react`: `^5.1.1` → `catalog:`
- `eslint`: `^9.39.4` → `catalog:`
- `jest`: `^29.7.0` → `catalog:`
- `tailwindcss`: `^3.4.18` → `catalog:`
- `ts-jest`: `^29.4.6` → `catalog:`
- `typescript`: `^5.9.3` → `catalog:`
- `vite`: `^7.3.2` → `catalog:`

### master
File: `apps/master/package.json`

**dependencies:**
- `@sentry/node`: `^10.46.0` → `catalog:`
- `@sentry/react`: `^10.39.0` → `catalog:`
- `@tanstack/react-query`: `^5.90.10` → `catalog:`
- `bcryptjs`: `^2.4.3` → `catalog:`
- `clsx`: `^2.1.1` → `catalog:`
- `dexie`: `^4.2.1` → `catalog:`
- `express`: `^5.1.0` → `catalog:`
- `formidable`: `^2.1.5` → `catalog:`
- `helmet`: `^8.1.0` → `catalog:`
- `jsonwebtoken`: `^9.0.2` → `catalog:`
- `lucide-react`: `^0.562.0` → `catalog:`
- `react`: `^19.2.0` → `catalog:`
- `react-dom`: `^19.2.0` → `catalog:`
- `sharp`: `^0.33.2` → `catalog:`
- `tailwind-merge`: `^3.4.0` → `catalog:`
- `uuid`: `^10.0.0` → `catalog:`
- `zod`: `^4.1.13` → `catalog:`
- `zustand`: `^5.0.12` → `catalog:`

**devDependencies:**
- `@playwright/test`: `^1.58.2` → `catalog:`
- `@testing-library/jest-dom`: `^6.9.1` → `catalog:`
- `@testing-library/react`: `^16.3.2` → `catalog:`
- `@types/react`: `^19.2.7` → `catalog:`
- `@types/react-dom`: `^19.2.3` → `catalog:`
- `@vitejs/plugin-react`: `^5.1.1` → `catalog:`
- `eslint`: `^9.39.4` → `catalog:`
- `jest`: `^29.7.0` → `catalog:`
- `tailwindcss`: `^3.4.18` → `catalog:`
- `ts-jest`: `^29.4.6` → `catalog:`
- `typescript`: `^5.9.3` → `catalog:`
- `vite`: `^7.3.2` → `catalog:`

### moneytrash
File: `apps/moneytrash/package.json`

**dependencies:**
- `clsx`: `^2.1.1` → `catalog:`
- `lucide-react`: `^0.577.0` → `catalog:`
- `react`: `^19.2.0` → `catalog:`
- `react-dom`: `^19.2.0` → `catalog:`
- `tailwind-merge`: `^3.4.0` → `catalog:`
- `uuid`: `^11.0.3` → `catalog:`

**devDependencies:**
- `@playwright/test`: `^1.50.0` → `catalog:`
- `@types/react`: `^19.2.7` → `catalog:`
- `@types/react-dom`: `^19.2.3` → `catalog:`
- `@vitejs/plugin-react`: `^5.1.1` → `catalog:`
- `eslint`: `^9` → `catalog:`
- `tailwindcss`: `^3.4.18` → `catalog:`
- `typescript`: `^5.9.3` → `catalog:`
- `vite`: `^7.3.2` → `catalog:`

### touch
File: `apps/touch/package.json`

**dependencies:**
- `@sentry/node`: `^10.48.0` → `catalog:`
- `@sentry/react`: `^10.48.0` → `catalog:`
- `@tanstack/react-query`: `^5.90.10` → `catalog:`
- `clsx`: `^2.1.1` → `catalog:`
- `cors`: `^2.8.5` → `catalog:`
- `dexie`: `^4.2.1` → `catalog:`
- `express`: `^5.2.1` → `catalog:`
- `formidable`: `2.1.5` → `catalog:`
- `helmet`: `^8.1.0` → `catalog:`
- `jsonwebtoken`: `^9.0.2` → `catalog:`
- `react`: `^19.2.0` → `catalog:`
- `react-dom`: `^19.2.0` → `catalog:`
- `sharp`: `^0.34.5` → `catalog:`
- `tailwind-merge`: `^3.4.0` → `catalog:`
- `uuid`: `^10.0.0` → `catalog:`
- `zod`: `^4.1.13` → `catalog:`

**devDependencies:**
- `@playwright/test`: `^1.58.2` → `catalog:`
- `@testing-library/jest-dom`: `^6.9.1` → `catalog:`
- `@testing-library/react`: `^16.3.2` → `catalog:`
- `@types/react`: `^19.2.7` → `catalog:`
- `@types/react-dom`: `^19.2.3` → `catalog:`
- `@vitejs/plugin-react`: `^5.1.1` → `catalog:`
- `eslint`: `^9.39.4` → `catalog:`
- `jest`: `^29.7.0` → `catalog:`
- `tailwindcss`: `^3.4.18` → `catalog:`
- `ts-jest`: `^29.4.6` → `catalog:`
- `typescript`: `^5.9.3` → `catalog:`
- `vite`: `^7.3.2` → `catalog:`

### website
File: `apps/website/package.json`

**dependencies:**
- `clsx`: `^2.1.1` → `catalog:`
- `lucide-react`: `^0.577.0` → `catalog:`
- `react`: `^19.2.0` → `catalog:`
- `react-dom`: `^19.2.0` → `catalog:`
- `tailwind-merge`: `^3.4.0` → `catalog:`

**devDependencies:**
- `@playwright/test`: `^1.58.2` → `catalog:`
- `@testing-library/react`: `^16.3.2` → `catalog:`
- `@types/react`: `^19.2.7` → `catalog:`
- `@types/react-dom`: `^19.2.3` → `catalog:`
- `@vitejs/plugin-react`: `^5.1.1` → `catalog:`
- `eslint`: `^9.39.4` → `catalog:`
- `tailwindcss`: `^3.4.18` → `catalog:`
- `typescript`: `^5.9.3` → `catalog:`


## Security Overrides Applied
These packages are force-pinned across the monorepo via `pnpm.overrides`:

- `jsonwebtoken`: `^9.0.3`
- `bcryptjs`: `^3.0.0`
- `helmet`: `^8.2.0`
- `express`: `^5.2.1`
- `jose`: `^6.0.0`