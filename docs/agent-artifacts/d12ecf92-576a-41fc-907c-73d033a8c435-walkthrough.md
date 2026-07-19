# ClickFlash v3.0.0 — Production Release & Ecosystem Walkthrough

We have completed the full build, packaging, manual generation, and verification for the **ClickFlash v3.0.0 Production Release** targeting the 3 Sousse hotel deployments.

---

## 📁 Release Directory Structure (`C:\Users\alamo\Desktop\ClickFlash_Release_v3.0\`)

```
ClickFlash_Release_v3.0/
├── 01_Installation_Manuals/
│   ├── Cloud_Infrastructure_Setup.md (1.0 KB)
│   └── Studio_Network_Setup.md       (0.8 KB)
├── 02_User_Manuals/
│   ├── Operator_Guide.md             (0.9 KB)
│   └── Customer_Kiosk_Guide.md       (0.9 KB)
├── 03_Production_Builds/
│   ├── ClickFlash_Master_Setup.exe            (378.70 MB)
│   ├── ClickFlash_Touch_Setup.exe             (157.85 MB)
│   ├── ClickFlash_Studio_Setup.exe            (93.99 MB)
│   └── ClickFlash_License_Generator_Setup.exe (92.65 MB)
└── 04_Assets_and_Config/
    └── .env.example                           (0.4 KB)
```

---

## 🚀 Packaged Applications & Features

### 1. ClickFlash Master Portal (`ClickFlash_Master_Setup.exe`)
* **Role**: Central studio operating system, hardware trigger controller, and local management portal.
* **v3.0.0 Highlights**:
  * **UDP Hardware Triggers**: Listens on UDP Port `5555` for physical sensors, foot pedals, and camera rigs.
  * **AI AutoCrop & Volume Export**: Integrated background workers (`photoWorker`, `folderWorker`) that detect subjects and crop high-volume photo sets automatically.
  * **Boomerang Generation**: Automatically stitches burst shots triggered by hardware into video reels for customer galleries.
  * **Automated Drip Campaigns**: Configured via SendGrid for 3-day follow-up and abandoned cart workflows.

### 2. ClickFlash Touch Kiosk (`ClickFlash_Touch_Setup.exe`)
* **Role**: Customer-facing self-service terminal for browsing galleries, AR previews, and instant checkout.
* **v3.0.0 Highlights**:
  * **Zero-Config HTTP Pairing**: Automatically discovers and links to the local `Master` server over the subnet without requiring shared folder mapping.
  * **Facial Search**: Customer camera scans biometric landmarks to match against the day's local gallery instantly.
  * **Magic Shots / AR Overlays**: Automated green screen background replacements and digital composites.

### 3. Studio 1-Click Installer (`ClickFlash_Studio_Setup.exe`)
* **Role**: Unified deployment installer for rapid studio provisioning.
* **v3.0.0 Highlights**:
  * Bundles setup workflows to install and link both `Master` and `Touch` together on dual-screen or networked studio machines in a single step.

### 4. License Generator Desktop App (`ClickFlash_License_Generator_Setup.exe`)
* **Role**: Admin utility for issuing cryptographically secure licenses for studio installations.
* **v3.0.0 Highlights**:
  * Uses the new `@clickflash/licensing` Ed25519 detached signature format (`CF-LIVE-...` / `CF-TEST-...`), completely eliminating the old 24-character mismatch issue.

---

## 📖 Manuals & Documentation Preview

### `Cloud_Infrastructure_Setup.md`
Covers Edge AI vector processing (where facial embeddings are computed locally on Edge devices to guarantee privacy), zero-config kiosk pairing requirements, and deploying the background Cloudflare Worker (`npm run deploy` inside `apps/cloud-backend`).

### `Studio_Network_Setup.md`
Details network configuration for UDP Port `5555` triggers, router settings (disabling AP Isolation for Kiosk discovery), and Windows Firewall rules (`TCP Port 8090`).

### `Operator_Guide.md`
Walkthrough for photographers on enabling **AI AutoCrop** during volume exports, managing hardware burst Boomerang capture loops, and configuring SendGrid keys.

### `Customer_Kiosk_Guide.md`
Customer walkthrough explaining the **Find My Photos** facial search flow, AR Magic Shot previewing, and Stripe Terminal / Cash instant checkout.

---

## 🛠️ How to Preview Live Applications Locally

If you want to spin up any of the live UIs in dev mode right now to inspect their screens:

1. **Master Portal & Backend**:
   ```bash
   cd apps/master && npm run dev
   # Frontend: http://localhost:5173 | Backend API: http://localhost:8090
   ```
2. **Touch Kiosk**:
   ```bash
   cd apps/touch && npm run dev
   # Frontend: http://localhost:5175 | Backend API: http://localhost:8091
   ```
3. **License Generator**:
   ```bash
   cd apps/license-generator && npm run dev:renderer
   # Frontend: http://localhost:5176
   ```
