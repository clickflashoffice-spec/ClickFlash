# ClickFlash CI/CD GitOps Plan

> **V5 Deployment & Verification Pipeline**

## 1. Pre-Commit / Local Hygiene
- **Hooks**: Husky enforcing `lint-staged` and Conventional Commits (`commitlint`).
- **Secret Scanning**: Custom Node script (`check-tracked-private-key-filenames.mjs`) blocking `.env` commits.

## 2. GitHub Actions (CI)
- **Caching**: Turborepo remote caching proxy (`dtinth/setup-github-actions-caching-for-turbo`).
- **Triggers**: On Pull Request to `main`.
- **Pipeline Steps**:
  1. `pnpm install --frozen-lockfile`.
  2. `pnpm typecheck:all`.
  3. `pnpm lint:all`.
  4. `pnpm test:all` (Vitest concurrent execution).
  5. Rust Core `cargo check` (Linux/macOS runners).

## 3. Continuous Delivery (CD)
- **Cloud Backend**: Cloudflare Wrangler deployments (`npm run deploy` on push to main).
- **Master Node**: Electron-builder auto-updates synced to GitHub Releases.
- **Frontend Apps**: Vercel/Cloudflare Pages deployments with preview environments.

## 4. Multi-Environment Config
- `.env.cloud` (Prod API)
- `.env.test_master` (Staging)
- `.env.TN001-MO` (Edge specific configs)
