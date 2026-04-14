# ClickFlash — Deployment Runbook

Last updated: 2026-04-08

---

## Apps at a Glance

| App | Deploy target | Build command | Output |
|-----|--------------|---------------|--------|
| master | Windows .exe (Electron) | `npm run package:installer` | `release/ClickFlash Master OS Setup.exe` |
| touch | Windows .exe (Electron) | `npm run dist` | `release/touch/*.exe` |
| gallery | Docker / Cloudflare Pages | `npm run build` | `dist/` |
| management | Docker / Cloudflare Pages | `npm run build` | `dist/` |
| moneytrash | Cloudflare Pages | `npm run build` | `.next/` |
| website | Cloudflare Pages | `npm run build` | `out/` or `dist/` |
| master-cpp | Windows native | `cmake --build build` | `build/Release/master-cpp.exe` |

---

## 1. Master (Electron — Windows)

### Dev
```bash
cd apps/master
npm install
npm run dev:electron          # starts backend (:8090) + Vite (:5173) + Electron
```
Credentials on first run: `pb_data/FIRST_RUN_CREDENTIALS.txt` next to the exe.

### Build portable (no installer)
```bash
npm run package               # → release/win-unpacked/
```

### Build installer (NSIS)
```bash
npm run package:installer     # → release/ClickFlash Master OS Setup X.Y.Z.exe
```
> Note: First build takes ~10 min — Windows Defender scans node_modules files.
> AV exclusion on `release/` speeds this up significantly.

### Post-install first run
1. Double-click `ClickFlash Master OS Setup.exe`, install to `C:\Program Files\ClickFlash\Master`
2. Launch — app creates `pb_data/` next to the exe
3. Read `pb_data/FIRST_RUN_CREDENTIALS.txt` for login credentials
4. Log in at `http://localhost:5173` (dev) or the Electron window (prod)

### Updating
The app checks for updates via `electron-updater` on launch. Update channel is configured in `electron-builder.json`.

---

## 2. Touch (Electron — Windows)

### Dev
```bash
cd apps/touch
npm install
npm run dev:electron          # starts backend (:8091) + Vite (:5173) + Electron
```

### Build
```bash
npm run dist                  # builds + copies .exe to ../distribution/
```

### Pairing with Master
1. Open Master → Settings → Kiosks → Add Kiosk
2. On Touch kiosk, enter Master's local IP when prompted
3. POST `/api/pairing` is called automatically with kiosk UUID

---

## 3. Gallery (Docker / Cloudflare Pages)

### Dev
```bash
cd apps/gallery
npm install
npm run dev:full              # backend :8080 + Vite :5174
```

### Docker deploy
```bash
docker build -t clickflash-gallery .
docker run -d \
  -p 8080:8080 \
  -v /data/gallery:/app/pb_data \
  -e JWT_SECRET=<secret> \
  --name gallery \
  clickflash-gallery
```

### Cloudflare Pages deploy
```bash
npm run build                 # outputs dist/
# Push to repo — CF Pages auto-deploys on main branch push
# Backend must run separately (Docker or VPS) — Pages only serves the SPA
```

### GDPR data erasure
```bash
curl -X POST http://localhost:8080/api/system/erase-customer-data \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"email": "customer@example.com"}'
```

---

## 4. Management (Docker / Cloudflare Pages)

### Dev
```bash
cd apps/management
npm install
npm run dev:full              # backend :8085 + Vite :5175
```

### Docker deploy
```bash
docker build -t clickflash-management .
docker run -d \
  -p 8085:8085 \
  -v /data/management:/app/pb_data \
  -e JWT_SECRET=<secret> \
  --name management \
  clickflash-management
```

### GDPR data erasure
```bash
curl -X POST http://localhost:8085/api/system/erase-customer-data \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"email": "customer@example.com"}'
```

---

## 5. MoneyTrash (Cloudflare Pages)

### Dev
```bash
cd apps/moneytrash
npm install
npm run dev                   # :3000
```

### Credentials file
Copy `external-uploader-credentials.json.example` → `external-uploader-credentials.json` and fill in real API keys.
**Never commit the real file** — it is in `.gitignore`.

### Deploy
```bash
npm run build
npx wrangler pages deploy out --project-name clickflash-moneytrash
```

---

## 6. master-cpp (Windows native binary)

See `apps/master-cpp/BUILD.md` for full prerequisites.

### Prerequisites
```
winget install Kitware.CMake
# Qt6 via online installer → Qt 6.x MSVC2022 x64
vcpkg install qt6 opencv4 spdlog nlohmann-json boost-filesystem
```

### Build
```bash
cd apps/master-cpp
cmake -B build -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_PREFIX_PATH="C:/Qt/6.x.x/msvc2022_64" \
  -DCMAKE_TOOLCHAIN_FILE=%VCPKG_ROOT%/scripts/buildsystems/vcpkg.cmake
cmake --build build --config Release
```

Output: `build/Release/master-cpp.exe`

---

## Venue Setup Checklist

```
[ ] Master PC — install Master .exe, verify health at :8090/api/health
[ ] Touch kiosks — install Touch .exe, pair with Master
[ ] Gallery — deploy Docker or push to CF Pages, set JWT_SECRET
[ ] Management — deploy Docker or push to CF Pages, set JWT_SECRET
[ ] Network — all kiosks on same LAN subnet, mDNS (Bonjour) enabled
[ ] Printers — USB receipt printers connected to touch kiosks
[ ] RFID readers — USB serial connected to touch kiosks
[ ] Credentials — rotate any default passwords after first boot
[ ] Backup — pb_data/ directories scheduled for nightly backup
```

---

## Environment Variables

| Variable | Apps | Default | Notes |
|----------|------|---------|-------|
| `DEFAULT_ADMIN_EMAIL` | master | `admin@clickflash.local` | Override for custom email |
| `DEFAULT_ADMIN_PASSWORD` | master | auto-generated | Written to `pb_data/FIRST_RUN_CREDENTIALS.txt` |
| `DEFAULT_ADMIN_NAME` | master | `Admin` | |
| `DATA_DIR` | master, touch | `pb_data/` next to exe | Set by electron-main.js automatically |
| `JWT_SECRET` | gallery, management | hardcoded fallback | **Must be set in production** |
| `PORT` | gallery, management | 8080 / 8085 | |
| `NODE_ENV` | all | `development` | Set to `production` in Docker |

---

## Health Checks

| App | URL |
|-----|-----|
| master | `GET http://localhost:8090/api/health` |
| touch | `GET http://localhost:8091/api/health` |
| gallery | `GET http://localhost:8080/api/health` |
| management | `GET http://localhost:8085/api/health` |

All return `{ status: "ok" }` on success.
