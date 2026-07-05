# Forensic Architecture Report: `apps/installer/` — Studio Installer Wizard

> Generated: 2026-06-22 | Scope: Electron + Vite + React 19, one-click setup, offline license validation, Cloudflare OAuth, Master/Touch spawn

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
| **Test files** | 1 |
| **Key dependencies** | `electron`, `lucide-react`, `qrcode`, `clsx`, `tailwind-merge` |

**Entry flow**: `electron-main.ts` creates a sandboxed `BrowserWindow` (900x650) loading either the Vite dev server or packaged `index.html`. The renderer entry `src/main.tsx` mounts `App.tsx`, which is a 9-step wizard driven by `useInstallerState`.

## 2. Folder/File Tree

```
apps/installer/
├── electron-main.ts              # Electron main process: IPC, OS integration
├── preload.ts                    # Context-isolated preload bridge
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

1. **New studio setup**: welcome -> validate offline license -> OAuth to Cloudflare Hub -> choose install path -> configure studio -> pair kiosk -> first sync -> health check -> launch apps
2. **Offline license validation**: `validateLicenseKey` script checks key locally, extracts tenant/region/plan/features/max_masters/expires_at
3. **Cloudflare OAuth device-code flow**: request device code -> open browser for user_code -> poll Hub for token
4. **Desk registration**: `registerFleet` POSTs to `/api/masters/register` with hardware fingerprint
5. **Kiosk pairing**: mDNS discovery or LAN sweep -> challenge/response HMAC exchange -> obtain `hmac_secret`
6. **System integration**: Windows firewall rules, startup registry entry, cloudflared tunnel service install

### Sub-features
- Hardware fingerprint (WMIC UUID / hostname hash)
- Token encryption: Windows DPAPI, macOS Keychain, Linux libsecret, AES-256-GCM fallback
- Config saved to `~/.clickflash/installer-config.json` (mode 0o600)
- Installer log at `%TMP%/clickflash-installer.log`

## 6. State Management

| Layer | Tech | Usage |
|-------|------|-------|
| Wizard state | `useState` in `useInstallerState` | Step index, loading, error, logs, license, hub, desk, studio, pairings, health |
| Cross-process API | Electron IPC | `window.installerApi` exposed via preload |
| Persistence | Node fs | Encrypted token file, installer config |
| Global store | none | All state local to hook |

## 7. API / Backend

The installer has no backend; it calls external APIs from the main process:

- **Hub**: `${CLICKFLASH_HUB_BASE}/api/v1/oauth/device/code`, `/api/v1/oauth/token`, `/api/masters/check-desk-id`, `/api/masters/register`, `/api/masters/heartbeat`
- **Cloudflare API**: `https://api.cloudflare.com/client/v4/accounts`
- **Local Master/Touch**: `http://localhost:8090/api/health`, `http://localhost:8091/api/health`, pairing challenge/exchange endpoints
- **Cloudflared download**: GitHub releases

## 8. Database

None. Stores config in JSON file and encrypted token in OS credential store or `~/.clickflash/.key`.

## 9. Security Surface

| Area | Status | Notes |
|------|--------|-------|
| Renderer isolation | good | `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, preload bridge |
| Navigation | restricted | `will-navigate`/`will-redirect` block non-localhost URLs; external links open in system browser |
| Protocol | privileged | `clickflash-installer://` registered with `bypassCSP: true` (risky) |
| License validation | offline | uses local script `scripts/license-key` |
| Token storage | strong | DPAPI / Keychain / libsecret / AES-256-GCM fallback |
| Config file | mode 0o600 | good |
| OAuth | device-code flow | token polled from Hub; no client secret |
| Pairing | HMAC challenge-response | secret derived from `masterDeskId + hardwareFingerprint` |
| OS commands | elevated ops | firewall, registry, cloudflared service install require admin/UAC |
| Downloads | cloudflared from GitHub | no checksum verification visible |
| Logging | file in temp | may leak sensitive paths; log rotation absent |
| Input validation | manual | no Zod schemas visible |

## 10. Testing

- `src/services/pairing.test.ts` — single test file
- Vitest + React Testing Library in devDependencies

### Observed gaps
- No Electron main-process tests
- No end-to-end installer flow tests
- No tests for token encryption cross-platform
- No tests for OS integration (firewall/registry/cloudflared)

## 11. Architecture / Performance / Design System

- **Electron security model**: modern secure defaults (sandbox, contextIsolation, no nodeIntegration).
- **Wizard pattern**: linear stepper with limited backtracking; state machine in hook could be simplified with a reducer.
- **Design system**: Tailwind; cyan/slate theme consistent with website.
- **Performance**: small bundle; OS-native operations may block UI if not offloaded to workers.
- **Bundle**: `qrcode` library for QR pairing; `lucide-react` icons.

## 12. Concrete Improvement Proposals

1. **Add a root `test:e2e` Playwright suite** using Electron launch args to exercise the full wizard flow.
2. **Replace `any` types** in `tokenEncryption.ts` dynamic require blocks with platform-specific optional peer dependency types.
3. **Add checksum/signature verification** for downloaded `cloudflared.exe`.
4. **Move OS command execution** to a worker thread to keep UI responsive during firewall/registry/tunnel setup.
5. **Add Zod schemas** for all IPC payloads and Hub responses.
6. **Reduce `bypassCSP` protocol privilege** unless strictly required.
7. **Implement log rotation and redaction** to avoid leaking tokens or file paths.
8. **Persist pairing secrets** in the OS keychain instead of plain config JSON.
