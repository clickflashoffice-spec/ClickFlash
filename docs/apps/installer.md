# Forensic Architecture Report: `apps/installer/` — Studio Installer Wizard

> Generated: 2026-06-22 | Security/release evidence updated: 2026-07-17. The current release decision and cross-app findings live in `docs/DESKTOP_APPLICATION_AUDIT_2026-07-16.md`.

## 1. Overview & Stats

| Attribute | Value |
|-----------|-------|
| **App name** | `clickflash-installer` |
| **Version** | 5.0.0 |
| **Frontend stack** | React 19.2, TypeScript 5.9, Vite 7.3, Tailwind CSS 3.4 |
| **Desktop shell** | Electron 39.8.7, electron-builder 26.8.1 |
| **Deployment target** | Windows installer `.exe` (electron-builder) |
| **Package manager** | pnpm 10.28.2 |
| **TS/TSX files** | 32 |
| **Component files** | 14 |
| **Test files** | 10 |
| **Key dependencies** | `electron`, `zod`, `systeminformation`, `lucide-react`, `qrcode`, `clsx`, `tailwind-merge` |

**Entry flow**: `electron-main.ts` creates a sandboxed `BrowserWindow` (900x650) loading either the Vite dev server or packaged `index.html`. The renderer entry `src/main.tsx` mounts `App.tsx`, which is a 9-step wizard driven by `useInstallerState`.

## 2. Folder/File Tree

```
apps/installer/
├── electron-main.ts              # Electron main process: IPC, OS integration
├── preload.ts                    # Context-isolated preload bridge
├── electron-security.ts          # Renderer, URL, LAN, path, and launch policy
├── electron-network-security.ts  # Bounded, redirect-denied JSON requests
├── installer-ipc-schemas.ts      # Strict privileged payload/response schemas
├── installer-config.ts           # safeStorage protection + atomic JSON writer
├── installer-application-config.ts # Canonical payload layout + config transaction/rollback
├── installer-payload-verification.ts # Signed manifest, path, inventory, size, and SHA-256 verification
├── installer-payload-trust.ts      # Separate packaged/development payload trust roots
├── installer-payload-release.ts    # Deterministic inventory, signing, secret scan, atomic output
├── scripts/payload-release.ts      # Operator-only offline signing CLI (not packaged)
├── tsconfig.payload-tools.json     # Separate CLI compilation boundary
├── src/
│   ├── main.tsx                  # React renderer root
│   ├── App.tsx                   # 9-step wizard shell
│   ├── components/
│   │   ├── WelcomeStep.tsx
│   │   ├── LicenseStep.tsx
│   │   ├── CloudflareStep.tsx
│   │   ├── CloudflareStepOAuth.tsx
│   │   ├── DestinationStep.tsx
│   │   ├── StudioProfileStep.tsx
│   │   ├── TouchPairingStep.tsx
│   │   ├── FirstSyncStep.tsx
│   │   ├── HealthCheckStep.tsx
│   │   ├── CompleteStep.tsx
│   │   ├── PrerequisitesStep.tsx
│   │   └── WizardProgress.tsx
│   ├── hooks/
│   │   ├── useInstallerState.ts  # Central wizard state machine
│   │   └── useCloudflareApi.ts
│   ├── services/
│   │   ├── cloudflareProvision.ts
│   │   ├── fleetRegistration.ts
│   │   ├── healthCheck.ts
│   │   ├── oauthHandler.ts
│   │   ├── pairing.test.ts
│   │   ├── systemCheck.ts
│   │   ├── tokenEncryption.ts
│   │   └── touchPairing.ts
│   ├── types/installer.ts
│   └── utils/qrCode.ts
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tsconfig.electron.json
```

## 3. Screens / Pages / Routes

No web routes. The app is a single-window wizard with 9 steps:

1. **Welcome** — intro
2. **License** — offline license-key validation
3. **Cloud Account** — Cloudflare OAuth device-code flow
4. **Destination** — install directory, desk ID availability
5. **Studio Profile** — name, location, timezone, currency
6. **Kiosk Pairing** — discover/scan/pair a Touch kiosk with a Master
7. **First Sync** — register desk and sync shared config
8. **Health Check** — Master/Touch backend, heartbeat, D1/R2 checks
9. **Complete** — save config and optionally launch Master + Touch

## 4. UI Component Inventory

### Wizard shell
`App`, `WizardProgress`.

### Step components
`WelcomeStep`, `LicenseStep`, `CloudflareStepOAuth`, `DestinationStep`, `StudioProfileStep`, `TouchPairingStep`, `FirstSyncStep`, `HealthCheckStep`, `CompleteStep`.

### Support
`PrerequisitesStep` (likely legacy), `CloudflareStep` (legacy), `useCloudflareApi` hook.

### Feedback states
- Loading spinner in header when `state.isLoading`
- Error banner in main content
- Logs in footer

### Accessibility / responsive
- Skip link absent (expected for desktop wizard)
- Tailwind responsive classes present
- No keyboard trap handling visible

## 5. Features & User Journeys

1. **New studio setup**: welcome -> choose and verify signed application bundle -> validate offline license -> OAuth to Cloudflare Hub -> configure studio -> pair kiosk -> first sync -> health check -> launch apps
2. **Offline license validation**: `validateLicenseKey` verifies the Ed25519 signature, schema, expiry, and optional machine binding locally, returning plan, studio limit, expiry, and machine identity
3. **Cloudflare OAuth device-code flow**: request device code -> open browser for user_code -> poll Hub for token
4. **Desk registration**: `registerFleet` POSTs to `/api/masters/register` with hardware fingerprint
5. **Kiosk pairing**: mDNS discovery or LAN sweep -> challenge/response HMAC exchange -> obtain `hmac_secret`
6. **System integration**: Windows firewall rules, startup registry entry, cloudflared tunnel service install

### Sub-features
- Hardware fingerprint through `systeminformation`
- License-key protection through Electron `safeStorage`; persistence fails closed when OS encryption is unavailable
- Strict-schema, bounded, atomic config save at `~/.clickflash/installer-config.json`
- Signed local payload selection with a separate Ed25519 public-key trust domain and full-file SHA-256 verification
- Deterministic offline payload signer that accepts an external PKCS#8 Ed25519 key, rejects secret-like/private-key content, atomically writes the envelope, and self-verifies
- Installer log at `%TMP%/clickflash-installer.log` (redaction/rotation remains open)

## 6. State Management

| Layer | Tech | Usage |
|-------|------|-------|
| Wizard state | `useState` in `useInstallerState` | Step index, loading, error, logs, license, hub, desk, studio, pairings, health |
| Cross-process API | Electron IPC | `window.installerApi` exposed via preload |
| Persistence | Node fs + Electron `safeStorage` | Atomic installer config with OS-protected license key |
| Global store | none | All state local to hook |

## 7. API / Backend

The installer has no backend; it calls external APIs from the main process:

- **Hub**: `${CLICKFLASH_HUB_BASE}/api/v1/oauth/device/code`, `/api/v1/oauth/token`, `/api/masters/check-desk-id`, `/api/masters/register`, `/api/masters/heartbeat`
- **Cloudflare API**: `https://api.cloudflare.com/client/v4/accounts`
- **Local Master/Touch**: fixed loopback health ports plus private-LAN pairing challenge/exchange endpoints

## 8. Database

None. Stores strict non-secret metadata plus an OS-protected license-key blob in one atomically replaced JSON file.

## 9. Security Surface

| Area | Status | Notes |
|------|--------|-------|
| Renderer isolation | good | `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, preload bridge |
| Navigation | restricted | exact dev origin or packaged entry; credential-free HTTPS links require an explicit host allowlist |
| Protocol | restricted | secure/standard only; CSP bypass, fetch, and service-worker privileges removed |
| License validation | offline | verification-only Node Ed25519 path with strict signed payload schema |
| License storage | OS protected | Electron `safeStorage`; plaintext key is removed before persistence |
| Application payload | fail-closed verification | separate Ed25519 domain; signed raw manifest, exact canonical layout/inventory, safe paths, sizes, SHA-256, and minimum Installer version; rechecked before config/launch |
| Config files | bounded/transactional | allowlisted Master/Touch files, same-directory staging/fsync, digest manifest, all-file rollback |
| OAuth | device-code flow | token polled from Hub; no client secret |
| Pairing | private LAN only | DNS results must all be private IPv4 and the approved address is pinned for requests |
| Privileged IPC | authorized/validated | exact live top-frame sender plus strict Zod objects for renderer-controlled payloads |
| Network reads | bounded | redirects denied, timeouts applied, response type/schema checked, byte caps enforced |
| Logging | file in temp | may leak sensitive paths; log rotation absent |
| Packaging | gated | post-pack raw-byte scan rejects private keys and known licensing test artifacts |

### Offline payload release command

Prepare a bundle containing only `Master/` and optional `Touch/` unpacked application directories. Keep the private key outside that bundle, then run:

```powershell
pnpm --filter clickflash-installer payload:sign -- --bundle C:\ClickFlash\Payload --private-key D:\SecureKeys\payload.private.pem --key-id payload_2026_1 --release-id release_2026_07_17 --version 2.0.0 --min-installer-version 5.0.0 --created-at 2026-07-17T00:00:00.000Z
```

The command requires every value explicitly for reproducibility. It prints the public key, manifest SHA-256, components, file count, and total bytes; it never prints or copies the private key. Production use remains blocked until key custody is approved and the reported public key is reviewed and embedded in `installer-payload-trust.ts`.

## 10. Testing

- Ten Vitest suites cover license and payload signature verification, deterministic signing/CLI behavior, external-key custody, secret/private-material rejection, forged/tampered/traversal/undeclared payload rejection, IPC authorization/rejection, schemas, path/network policy, bounded requests, pairing, protected persistence, and atomic writes.
- Current result: **54/54 tests passed**.

### Observed gaps
- No end-to-end install/upgrade/repair/rollback journey on a clean Windows VM
- No clean-machine `safeStorage`/profile ACL evidence under separate Windows users
- No Authenticode certificate or trusted update-channel proof
- No approved production payload public key or authorized signed Master/Touch release bundle; packaged builds intentionally fail closed (the deterministic signer is complete)
- Payload acquisition/copy and transactional install/upgrade/repair/binary rollback remain unfinished; local bundle verification and application configuration commit/rollback are implemented

## 11. Architecture / Performance / Design System

- **Electron security model**: modern secure defaults (sandbox, contextIsolation, no nodeIntegration).
- **Wizard pattern**: linear stepper with limited backtracking; state machine in hook could be simplified with a reducer.
- **Design system**: Tailwind; cyan/slate theme consistent with website.
- **Performance**: small bundle; OS-native operations may block UI if not offloaded to workers.
- **Bundle**: `qrcode` library for QR pairing; `lucide-react` icons.

## 12. Concrete Improvement Proposals

1. **Add a root `test:e2e` Playwright suite** using Electron launch args to exercise the full wizard flow.
2. **Replace `any` types** in `tokenEncryption.ts` dynamic require blocks with platform-specific optional peer dependency types.
3. **Approve the payload-key custody ceremony**, embed only the reviewed public key, and use the completed offline signer to issue signed Master/Touch manifests.
4. **Make install/upgrade/repair/rollback transactional** with reboot and interruption recovery.
5. **Add log rotation and redaction** to avoid leaking tokens or file paths.
6. **Require Authenticode signing and timestamp verification** for production builds and updates.
7. **Run clean Windows 10/11 lifecycle tests** with standard and administrator accounts.
