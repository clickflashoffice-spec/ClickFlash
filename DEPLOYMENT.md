# ClickFlash v2.0.0 — Deployment Guide (Phase 20)

> **One-click installer generation & full ecosystem deployment**

---

## Prerequisites

| Tool | Required Version | Check |
|------|-----------------|-------|
| Node.js | ≥ 20 | `node -v` |
| pnpm | ≥ 10.28 | `pnpm -v` |
| Wrangler CLI | ≥ 3 | `wrangler -v` |
| Electron-Builder | ≥ 26 | via pnpm |
| Ed25519 key pair | Generated once | `scripts/gen-keypair.ts` |

---

## Step 1 — Install All Dependencies

```pwsh
pnpm install
```

---

## Step 2 — Build All Apps

```pwsh
npm run build:master
npm run build:touch
npm run build:management
npm run build:gallery
npm run build:website

pnpm --filter clickflash-master run build:electron
pnpm --filter clickflash-touch run build:electron
pnpm --filter clickflash-installer run build:electron
```

---

## Step 3 — Sign the Payload Bundle

The installer downloads a signed `.zip` bundle containing Master + Touch binaries.
The bundle is verified at install-time using the Ed25519 public key baked into the installer.

```pwsh
pnpm --filter clickflash-installer run build:payload-tool

pnpm --filter clickflash-installer run payload:sign -- `
  --bundle ./build/payload `
  --private-key C:\ClickFlash-Secrets\payload-signing-key.pem `
  --key-id prod-2026-07 `
  --release-id v2.0.0 `
  --version 2.0.0 `
  --min-installer-version 2.0.0 `
  --created-at 2026-07-19T00:00:00Z
```

> Keep `payload-signing-key.pem` OUTSIDE the repository. Never commit it.

---

## Step 4 — Upload Payload Bundle to R2

```pwsh
wrangler r2 object put clickflash-releases/v2.0.0/payload.zip `
  --file ./build/payload.zip `
  --content-type application/zip
```

---

## Step 5 — Package the NSIS Installer

```pwsh
pnpm --filter clickflash-installer run package:installer
```

Output: `apps/installer/release/ClickFlash-Studio-Setup-5.0.0-x64.exe`

---

## Step 6 — Deploy Cloudflare Workers

```pwsh
# Cloud backend (includes Phase 19 biometric D1 migration)
cd apps/cloud-backend
wrangler d1 migrations apply clickflash-db --remote
wrangler deploy

# Update server (v2.0.0 manifests)
cd workers/update-server
wrangler deploy
```

---

## Step 7 — Deploy Web Apps

```pwsh
# Management dashboard
cd apps/management && pnpm run build
wrangler pages deploy dist --project-name=clickflash-management

# Gallery
cd apps/gallery && pnpm run build
wrangler pages deploy dist --project-name=clickflash-gallery

# Website (Vercel CI on git push to main)
git push origin main
```

---

## Step 8 — Publish GitHub Release

1. `git tag v2.0.0 && git push --tags`
2. Upload `ClickFlash-Studio-Setup-5.0.0-x64.exe` to GitHub Release
3. Get SHA-256 of the .exe:
   ```pwsh
   (Get-FileHash ".\apps\installer\release\ClickFlash-Studio-Setup-5.0.0-x64.exe" -Algorithm SHA256).Hash
   ```
4. Update `signature` in `workers/update-server/index.ts`, then redeploy.

---

## Step 9 — Smoke Test

```pwsh
npm run typecheck:all
npm run lint:all
npm run test:all
```

### Manual Checks

- [ ] Install fresh on clean Windows machine
- [ ] Complete 9-step installer wizard
- [ ] Master PC biometric clock-in prompt appears
- [ ] Management → Workforce Dashboard shows real-time shifts
- [ ] Existing v1.x install is offered v2.0.0 update

---

## Rollback

Revert update server `latest` to `versions[0]` in `workers/update-server/index.ts` and redeploy.
D1 migrations are additive-only — no DB rollback needed.

---

## Deployment Map

```
Developer Machine
  ├── pnpm run package:installer → ClickFlash-Studio-Setup-5.0.0-x64.exe
  └── wrangler deploy
        ├── apps/backend/cloud-backend   (D1 + R2 + Stripe)
        ├── workers/update-server        (auto-update manifests v2.0.0)
        ├── apps/web/management          (Cloudflare Pages — Workforce Dashboard)
        └── apps/web/gallery             (Cloudflare Pages — guest photo delivery)

Field (Resort LAN)
  ├── Master PC  ← installer .exe (`apps/desktop/master`)
  │     ├── Express backend (SQLite + biometric LAN proxy)
  │     └── Background sync CRON → Cloudflare D1 + R2
  ├── Touch Kiosks ← installer .exe (`apps/desktop/touch`)
  └── Mobile Photographers ← Expo (`apps/mobile/pro`, `apps/mobile/consumer`)
        └── FaceBiometricService (BlazeFace + MobileNet 128D)
```
