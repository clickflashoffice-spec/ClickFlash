# ClickFlash v5.0.0 — Release Notes

> **Release Date:** June 6, 2026  
> **Previous Version:** v4.2.0  
> **Upgrade Priority:** HIGH — Recommended for all studios

---

## 🎯 What's New

### 1-Click Installer (New App)

The biggest change in v5.0 is the **ClickFlash Studio Setup** wizard — a brand-new installer app that reduces setup time from **4-6 hours to 10 minutes**.

**What it does:**
- Checks your computer meets all requirements
- Connects to Cloudflare automatically (no manual API calls)
- Creates your studio profile
- Pairs your Touch Kiosk automatically
- Runs health checks to confirm everything works
- Launches both Master Portal and Touch Kiosk when done

**Who needs it:**
- **New studios** — First-time installation
- **Existing studios** — Reinstalling or moving to a new computer
- **Multi-location studios** — Setting up additional locations

---

## 🌐 Multi-Master Global Fleet

**For studios with multiple locations** (e.g., Maldives + Dubai + Bali):

- Each location runs its own Master Portal
- All locations sync to the same Cloudflare Management Hub
- View all locations in one Fleet Dashboard
- Orders, photos, and settings sync automatically when online
- Each location works fully offline when internet is down

**How to enable:**
1. Install Master Portal at each location using the 1-Click Installer
2. Use the same Cloudflare account for all locations
3. The Management Hub automatically shows all locations

---

## 🔒 Security Upgrades

| Feature | v4.2.0 | v5.0.0 |
|---------|--------|--------|
| Database encryption | ❌ None | ✅ AES-256 (SQLCipher) |
| GDPR compliance | ❌ None | ✅ Full module |
| Health monitoring | ❌ None | ✅ Built-in checks |
| Token storage | ❌ Plain text | ✅ OS keychain (DPAPI/Keychain/Secret Service) |
| Audit logging | ✅ Basic | ✅ Comprehensive (GDPR + security) |

**What this means for you:**
- Customer data is encrypted on disk — safe even if the computer is stolen
- You can handle GDPR requests (data export, deletion) directly in the app
- The app monitors its own health and alerts you to problems
- Cloudflare tokens are stored securely by Windows/macOS/Linux

---

## 📱 Auto-Pairing

**Touch Kiosk now finds Master Portal automatically.**

- No more typing IP addresses
- No more manual configuration files
- Touch Kiosk discovers Master via network (mDNS/Bonjour)
- If automatic discovery fails, scan a QR code or enter IP manually

**What you need to do:** Nothing — it just works.

---

## 📦 Package Manager Change

**We switched from npm to pnpm.**

- Faster installs (30-50% faster)
- Better disk space usage (shared dependencies)
- Stricter dependency management (fewer "works on my machine" issues)

**For developers:** Use `pnpm install` instead of `npm install`
**For studio staff:** No change — the installer handles everything

---

## 🧪 Testing & Quality

- **29 new automated tests** covering installer, multi-master sync, offline/online transitions, and health checks
- **k6 performance tests** for load testing (steady-state, spike, soak scenarios)
- All CI/CD pipelines updated to use pnpm

---

## ⚡ Performance Improvements

- **Faster startup:** Master Portal now starts in ~3 seconds (was ~8 seconds)
- **Smoother sync:** Cloud sync uses adaptive intervals — faster when stable, slower when flaky
- **Better offline queue:** Touch Kiosk can queue 1000+ orders without slowing down
- **Thumbnail caching:** Photos load instantly after first view

---

## 🔄 Upgrade Instructions

### For Existing Studios (v4.2.0 → v5.0.0)

**Option A: In-App Update (Recommended)**
1. Open Master Portal
2. Wait for the "Update Available" notification
3. Click "Install Update"
4. The app downloads, installs, and restarts automatically
5. Your data and settings are preserved

**Option B: Reinstall with New Installer**
1. Download `ClickFlash-Studio-Setup-5.0.0.exe`
2. Run it — it detects your existing installation
3. Choose "Upgrade" (preserves all data)
4. Follow the wizard
5. Done in 10 minutes

**Option C: Manual Upgrade (Developers)**
1. `git pull` the latest code
2. `pnpm install` (note: pnpm, not npm)
3. `pnpm run build:all`
4. `pnpm --filter ./apps/master run package:installer`

---

### Data Migration

**Your data is safe:**
- Photos, orders, albums, and settings are preserved automatically
- The installer creates a backup before upgrading
- If anything goes wrong, you can restore from the backup

**What gets upgraded:**
- Database schema (automatic migration)
- Encryption keys (generated automatically)
- Cloudflare token storage (migrated to OS keychain)

---

## ⚠️ Breaking Changes

| Change | Impact | Action Required |
|--------|--------|-----------------|
| npm → pnpm | Developers only | Use `pnpm` instead of `npm` |
| New installer app | All users | Use new installer for future installs |
| Token storage format | Automatic | Tokens re-encrypted on first launch |
| Database encryption | Automatic | Database encrypted on first launch (may take 1-2 min) |

**No action required for studio staff** — everything is automatic.

---

## 🐛 Bug Fixes

- Fixed Touch Kiosk auto-updater not being included in build output
- Fixed inconsistent package manager usage across apps
- Fixed missing multi-master collision handling in fleet registration
- Fixed health check endpoints not returning sanitized output
- Fixed offline sync queue not persisting across app restarts
- Fixed mDNS discovery being blocked on some corporate networks (added QR fallback)

---

## 📚 New Documentation

| Document | For | Purpose |
|----------|-----|---------|
| `ONE-CLICK-INSTALL.md` | Studio staff | Step-by-step installation guide |
| `TROUBLESHOOTING.md` | Studio staff + IT | Common problems and fixes |
| `QUICKSTART.md` | Studio staff | One-page reference card |
| `CLOUDFLARE_INTEGRATION.md` | DevOps + IT | Cloud setup and fleet management |
| `SECURITY.md` | DevOps + IT | Threat model, encryption, incident response |
| `ELECTRON.md` | Developers | Electron architecture and security |
| `OFFLINE_SYNC.md` | Developers | Sync protocols and conflict resolution |
| `SETUP.md` | Developers | Development environment setup |
| `DEPLOYMENT.md` | DevOps | Production deployment and CI/CD |
| `EXECUTIVE_SUMMARY.md` | Management | Complete transformation record |

---

## 🗺️ Roadmap

### v5.1 (Q3 2026)
- Mobile companion app for studio managers (iOS/Android)
- AI-powered photo tagging and categorization
- Advanced analytics dashboard in Management Hub

### v5.2 (Q4 2026)
- Biometric login (fingerprint/face) for Touch Kiosk
- Customer self-service portal (web-based order tracking)
- Integration with popular photo lab APIs (print fulfillment)

### v6.0 (2027)
- Full cloud-native option (no local servers needed)
- AI photo editing suggestions
- Multi-language support (10+ languages)

---

## 💬 Feedback

We'd love to hear from you:
- **Bug reports:** GitHub Issues or support ticket
- **Feature requests:** Community forum
- **General feedback:** Email feedback@clickflash.app

---

**Thank you for using ClickFlash!**  
*The v5.0 transformation was the largest release in our history — 47 manual steps reduced to 1 click, enterprise-grade security, and global multi-master fleet management. We're excited to see what you create with it.*

---

**Download:** [ClickFlash-Studio-Setup-5.0.0.exe](https://github.com/clickflash/clickflash/releases/tag/v5.0.0)  
**Documentation:** [Full Docs](https://docs.clickflash.app)  
**Support:** [Support Portal](https://support.clickflash.app)

---

*End of Release Notes*
