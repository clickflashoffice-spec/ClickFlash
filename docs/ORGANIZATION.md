# ClickFlash Project Organization

> **Project reorganization completed on 2026-01-31**

## ✅ New Structure

```
E:\ClickFlash\
├── 📂 apps/                      # All 6 applications
│   ├── 📂 master/                # 🎛️ Master Portal (Electron + React 19)
│   ├── 📂 touch/                 # 📱 Touch Kiosk (Electron + React 19)
│   ├── 📂 moneytrash/            # 💰 Money Trash Uploader (Next.js 16)
│   ├── 📂 management/            # 📊 Management Hub (React + Vite)
│   ├── 📂 gallery/               # 🛍️ Customer Gallery (React + Vite)
│   └── 📂 website/               # 🌐 Main Website (Next.js 15)
│
├── 📂 packages/                  # Shared packages (monorepo)
│   ├── 📂 lib/
│   ├── 📂 types/
│   ├── 📂 ui/
│   └── 📂 utils/
│
├── 📂 tools/                     # Build & deployment tools
│   └── 📂 scripts/
│
├── 📂 deployment/                # Docker & deployment configs
├── 📂 docs/                      # Documentation
├── 📂 .agent/                    # Agent documentation
├── 📄 package.json               # Root workspace configuration
└── 📄 README.md                  # Project documentation
```

---

## 🔄 Migration Mapping

| Old Path | New Path | Status |
|----------|----------|--------|
| `master-app/react-new-backup/` | `apps/master/` | ✅ Migrated |
| `touch-app/react/` | `apps/touch/` | ✅ Migrated |
| `moneytrash-uploader/` | `apps/moneytrash/` | ✅ Migrated |
| `management/` | `apps/management/` | ✅ Migrated |
| `customer-gallery/` | `apps/gallery/` | ✅ Migrated |
| `main-website/` | `apps/website/` | ✅ Migrated |
| `scripts/` | `tools/scripts/` | ✅ Migrated |
| `shared/` | `packages/shared/` | ✅ Migrated |
| `lib/` | `packages/lib/` | ✅ Migrated |

---

## 🚀 Quick Start Commands

```bash
# Install all dependencies
npm run install:all

# Start development servers
npm run dev:master        # Master Portal - Port 8090
npm run dev:touch         # Touch Kiosk - Port 8091
npm run dev:moneytrash    # Money Trash Uploader - Port 3000
npm run dev:management    # Management Hub
npm run dev:gallery       # Customer Gallery
npm run dev:website       # Main Website - Port 3001

# Build all apps
npm run build:master
npm run build:touch
npm run build:moneytrash
npm run build:management
npm run build:gallery
npm run build:website

# Clean build artifacts
npm run clean
```

---

## 📊 Workspace Configuration

Root `package.json` includes:

```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

This enables:
- **Hoisted dependencies** - Shared packages installed once at root
- **Cross-package imports** - `import '@clickflash/types'` 
- **Unified build system** - Build all apps from root

---

## 🧹 Cleanup Notes

**Old folders** (`master-app/`, `touch-app/`, etc.) still exist in root but are **no longer used**. They contain:
- Original source code (now copied to `apps/`)
- Large `node_modules/` directories
- Build artifacts (`.next/`, `dist/`, etc.)

**To remove old folders manually:**
```powershell
# Run from E:\ClickFlash\
Remove-Item -Recurse -Force master-app/
Remove-Item -Recurse -Force touch-app/
Remove-Item -Recurse -Force moneytrash-uploader/
Remove-Item -Recurse -Force management/
Remove-Item -Recurse -Force customer-gallery/
Remove-Item -Recurse -Force main-website/
Remove-Item -Recurse -Force scripts/
Remove-Item -Recurse -Force shared/
Remove-Item -Recurse -Force lib/
```

Or simply delete them via Windows Explorer.

---

## 📚 Documentation

All documentation has been updated to reflect new paths:

| Document | Description |
|----------|-------------|
| `README.md` | Main project README with quick start |
| `.agent/ARCHITECTURE.md` | System architecture & data flow |
| `.agent/FILE_STRUCTURE.md` | Complete file organization |
| `.agent/TECH_STACK.md` | Technology specifications |
| `.agent/TODO.md` | Active tasks & roadmap |

---

## ✅ Verification Checklist

- [x] All 6 apps moved to `apps/`
- [x] Shared code moved to `packages/`
- [x] Scripts moved to `tools/`
- [x] Root `package.json` with workspace config
- [x] Documentation updated with new paths
- [x] Apps excluded: `node_modules`, `.next`, `dist`, `pb_data`

---

## 🎯 Next Steps

1. **Install dependencies**: `npm run install:all`
2. **Test apps**: Run `npm run dev:master` etc.
3. **Remove old folders** when ready
4. **Start development** on incomplete apps:
   - `apps/moneytrash/` - Complete upload UI
   - `apps/management/` - Complete backend API
   - `apps/gallery/` - Complete backend API

---

**Organization Status: ✅ COMPLETE**
**Date: 2026-01-31**
