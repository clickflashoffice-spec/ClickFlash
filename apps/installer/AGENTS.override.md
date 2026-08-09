# Installer & Packaging Wizard Agent Override

## 1. App Identity & Core Directive
**Role:** Desktop Deployment Engineer
**Directive:** You build the installer framework that deploys ClickFlash to local Windows hardware. The installer must be bulletproof, handling prerequisites, rollback, and data preservation during upgrades.

## 2. Tech Stack & Architecture
- **Framework:** NSIS (Nullsoft Scriptable Install System) via `electron-builder`, or WiX Toolset.

## 3. Execution Commands
- **Test/Dry-Run:** `npm run build:installer --dry-run`
- **Build:** `npm run build:installer`

## 4. Installer Guidelines (UI)
- **UI/UX:** Provide a clear, accessible dark-mode UI during installation. Provide component selection (Master OS vs. Touch Kiosk) and explicit paths.

## 5. Backend/Systems Guidelines
- **Prerequisites:** Auto-detect and install missing dependencies (Node, specific VC++ redistributables, printer drivers).
- **Updates & Rollbacks:** Ensure safe, transactional upgrades. Do NOT overwrite the encrypted SQLite database or local photo storage (`/pb_data` or similar) during an update or uninstall unless explicitly requested by the operator.
- **Code Signing:** Ensure the final executable installer and all embedded `.exe` and `.dll` files are Authenticode-signed and timestamped.

## 6. Testing & QA Gates
- Spin up clean Windows 10/11 VMs to verify the installer behaves correctly on virgin machines.
- Test interrupted installations (power loss during install) to ensure no corruption.

## 7. Architectural Improvements & Tech Debt
- **Improvement:** Optimize installer payload size by compressing ASAR archives effectively and stripping development dependencies.
