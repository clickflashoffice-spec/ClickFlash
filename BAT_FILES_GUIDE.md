# ClickFlash - Batch Files Guide

> Complete guide to all `.bat` files in the ClickFlash ecosystem

---

## 📁 Root Level Commands

Located in `E:\ClickFlash\`

| File | Description |
|------|-------------|
| `install-all.bat` | Install dependencies for all apps and packages |
| `start-all.bat` | Start all 6 applications in development mode |
| `clean-all.bat` | Clean all build artifacts from all apps |
| `kill-all.bat` | Kill all Node.js and Electron processes |
| `status.bat` | Check status of all application ports |

### Usage Examples

```batch
# Install everything
install-all.bat

# Start all apps
start-all.bat

# Check what's running
status.bat

# Stop everything
kill-all.bat

# Clean all builds
clean-all.bat
```

---

## 📱 Master Portal (`apps\master\`)

Electron desktop app for master photographer (Port 8090)

| File | Description |
|------|-------------|
| `1_INSTALL.bat` | Install npm dependencies |
| `2_BUILD.bat` | Build frontend for production |
| `3_START_DEV.bat` | Start development mode (frontend + backend) |
| `4_START_PROD.bat` | Start production server |
| `5_PACKAGE.bat` | Build Electron package (.exe installer) |
| `6_TEST.bat` | Run unit tests |
| `7_CLEAN.bat` | Clean build artifacts |
| `8_E2E_TEST.bat` | Run E2E tests with Playwright |

---

## 📱 Touch Kiosk (`apps\touch\`)

Electron desktop app for customer self-service (Port 8091)

| File | Description |
|------|-------------|
| `1_INSTALL.bat` | Install npm dependencies |
| `2_BUILD.bat` | Build frontend for production |
| `3_START_DEV.bat` | Start development mode (frontend + backend) |
| `4_START_PROD.bat` | Start production server (with watchdog) |
| `5_PACKAGE.bat` | Build Electron package (.exe installer) |
| `6_TEST.bat` | Run unit tests |
| `7_CLEAN.bat` | Clean build artifacts |

---

## 💰 Money Trash Uploader (`apps\moneytrash\`)

Next.js web app for photo uploads (Port 3000)

| File | Description |
|------|-------------|
| `1_INSTALL.bat` | Install npm dependencies |
| `2_BUILD.bat` | Build for production |
| `3_START_DEV.bat` | Start Next.js development server |
| `4_START_PROD.bat` | Start production server |
| `5_LINT.bat` | Run ESLint |
| `6_CLEAN.bat` | Clean build artifacts |

---

## 📊 Management Hub (`apps\management\`)

React + Express web app for business management (Port 8092)

| File | Description |
|------|-------------|
| `1_INSTALL.bat` | Install npm dependencies |
| `2_BUILD.bat` | Build frontend for production |
| `3_START_DEV.bat` | Start both backend and frontend |
| `4_START_BACKEND.bat` | Start backend server only |
| `5_START_FRONTEND.bat` | Start Vite dev server only |
| `6_TEST.bat` | Run unit tests |
| `7_CLEAN.bat` | Clean build artifacts |

---

## 🛍️ Customer Gallery (`apps\gallery\`)

React + Express web app for photo viewing and purchases (Port 8093)

| File | Description |
|------|-------------|
| `1_INSTALL.bat` | Install npm dependencies |
| `2_BUILD.bat` | Build frontend for production |
| `3_START_DEV.bat` | Start both backend and frontend |
| `4_START_BACKEND.bat` | Start backend server only |
| `5_START_FRONTEND.bat` | Start Vite dev server only |
| `6_TEST.bat` | Run unit tests |
| `7_CLEAN.bat` | Clean build artifacts |

---

## 🌐 Main Website (`apps\website\`)

Next.js marketing website (Port 3001)

| File | Description |
|------|-------------|
| `1_INSTALL.bat` | Install npm dependencies |
| `2_BUILD.bat` | Build for production |
| `3_START_DEV.bat` | Start Next.js development server |
| `4_START_PROD.bat` | Start production server |
| `5_LINT.bat` | Run ESLint |
| `6_CLEAN.bat` | Clean build artifacts |

---

## 🌐 Port Reference

| App | Backend Port | Frontend Port |
|-----|-------------|---------------|
| Master Portal | 8090 | 5173 |
| Touch Kiosk | 8091 | 5174 |
| Money Trash | - | 3000 |
| Management Hub | 8092 | 5176 |
| Customer Gallery | 8093 | 5175 |
| Main Website | - | 3001 |

---

## 🚀 Quick Start Workflow

### First Time Setup
```batch
# 1. Install all dependencies
install-all.bat

# 2. Start all apps
start-all.bat
```

### Daily Development
```batch
# Start specific app only
cd apps\master
call 3_START_DEV.bat

# Or start all
start-all.bat
```

### Building for Production
```batch
# Electron app
cd apps\master
call 5_PACKAGE.bat

# Web app
cd apps\management
call 2_BUILD.bat
```

### Troubleshooting
```batch
# If ports are stuck
kill-all.bat

# If builds are corrupted
cd apps\[app-name]
call 7_CLEAN.bat
call 1_INSTALL.bat
```

---

## 📝 Notes

- All `.bat` files use `cd /d "%~dp0"` to ensure they run from their own directory
- Files are numbered for easy sorting in Windows Explorer
- Each script includes error checking and informative messages
- Scripts will auto-install dependencies if `node_modules` is missing
- Port conflicts are detected and warned before starting
