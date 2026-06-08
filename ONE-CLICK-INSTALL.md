# 🚀 ClickFlash Studio — One-Click Install Guide

> **Install your entire photography studio in under 3 minutes.**
> No command lines. No IT degree required. Just click, type, and shoot.

---

## 📋 Overview

The **ClickFlash Studio Setup** is a single installer that sets up everything your photography studio needs:

| App | What it does | Port |
|-----|-------------|------|
| **Master Portal** | Your main dashboard — albums, orders, payments, reports | `8090` |
| **Touch Kiosk** | In-studio customer self-service station | `8091` |

**Who this is for:**
- 🏠 Studio owners opening a new location
- 🖥️ Front-desk staff setting up a new computer
- 🔧 IT admins deploying across multiple desks

**What happens behind the scenes:**
The installer checks your computer, connects to ClickFlash Cloud, registers your studio, pairs your Touch Kiosk, and launches both apps automatically.

---

## 💻 System Requirements

Before you start, make sure your computer meets these minimums:

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **Operating System** | Windows 10/11, macOS 12+, or Ubuntu 22.04+ | Windows 11, macOS 14+, Ubuntu 24.04 |
| **RAM** | 4 GB | 8 GB |
| **Free Disk Space** | 10 GB | 20 GB |
| **Internet** | Broadband connection | Stable broadband |
| **Display** | 1280×720 | 1920×1080 or higher |
| **Administrator Rights** | Required on Windows | — |

> 💡 **Tip:** The installer works on both brand-new machines and existing studio computers. It will not delete your photos or other files.

---

## ⬇️ Download

Get the latest installer from our official release channel:

### 🌐 GitHub Releases (Recommended)
1. Visit: `https://github.com/clickflash/clickflash-installer/releases`
2. Download the file for your operating system:
   - **Windows:** `ClickFlash-Studio-Setup-5.0.0-x64.exe`
   - **macOS:** `ClickFlash-Studio-Setup-5.0.0-x64.dmg`
   - **Linux:** `ClickFlash-Studio-Setup-5.0.0-x86_64.AppImage`
3. Save it to your **Downloads** folder or Desktop.

> 🔒 **Security Note:** Always download from the official GitHub repository. The installer is code-signed and will show "ClickFlash Photography" as the publisher.

---

## 🖱️ Step-by-Step Installation

### Step 1: Run the Installer

**Windows:**
1. Open your **Downloads** folder.
2. Double-click `ClickFlash-Studio-Setup-5.0.0-x64.exe`.
3. If Windows shows a **User Account Control** prompt, click **Yes**. *(The installer needs administrator rights to set up system services.)*

**macOS:**
1. Open the `.dmg` file.
2. Drag **ClickFlash Studio Setup** into your **Applications** folder.
3. Double-click the app to launch.

**Linux:**
1. Right-click the `.AppImage` file.
2. Select **Properties** → **Permissions** → check **Allow executing file as program**.
3. Double-click to run.

> ⏱️ **Time estimate:** The installer window appears within 10–20 seconds.

---

### Step 2: Welcome Screen — Click "Get Started"

You'll see a friendly welcome screen with the ClickFlash logo and the text:

> **"Welcome to ClickFlash Studio Setup"**
> v5.0.0 — Multi-Master Global Sync

- Click the **"Get Started"** button.
- The progress bar at the top shows you are on **Step 1 of 7**.

---

### Step 3: System Check — Auto-Detects Everything

The installer automatically scans your computer:

| Check | What it looks for | What happens if missing |
|-------|-----------------|------------------------|
| **Node.js Runtime** | Version 20 or newer | Installer bundles its own — no action needed |
| **Disk Space** | At least 10 GB free | Warns you; free up space and retry |
| **Network Ports** | Ports `8090` and `8091` must be free | Lists what's using them; close the app or change ports |
| **Operating System** | Windows 10/11, macOS 12+, Ubuntu 22.04+ | Blocks install if unsupported |
| **Memory** | At least 4 GB RAM | Warns if low; may affect performance |

- ✅ Green checkmarks appear as each test passes.
- ⚠️ If you see a yellow warning, read the message and follow the suggestion.
- Click **"Continue"** once all checks pass.

> 💡 **Tip:** If a port is in use, the installer tells you exactly which app is using it (for example, "Port 8090 used by Skype"). Close that app and click **"Re-check"**.

---

### Step 4: Cloudflare Account — Paste API Token or Use OAuth

ClickFlash uses **Cloudflare** for secure cloud sync, photo storage, and global fleet management.

**Option A: Paste an API Token (Fastest)**
1. Log in to your [Cloudflare dashboard](https://dash.cloudflare.com) in your web browser.
2. Go to **My Profile** → **API Tokens** → **Create Token**.
3. Use the **"ClickFlash Studio"** template (or give these permissions: `Zone:Read`, `Account:Read`, `Cloudflare Images:Edit`).
4. Copy the token and paste it into the installer.
5. Click **"Test Token"**.
6. ✅ A green checkmark and your account name appear.

**Option B: Sign In with OAuth (Easiest)**
1. Click **"Sign In with Cloudflare"**.
2. Your web browser opens to a Cloudflare login page.
3. Log in and click **"Authorize"**.
4. The installer automatically receives your token — no copy/paste needed.

> 🔒 **Security Note:** Your token is encrypted and stored only on this computer. It is never sent to ClickFlash servers.

---

### Step 5: Fleet Registration — Auto-Generates Your Desk ID

This step connects your studio to the ClickFlash global network.

**What the installer does automatically:**
- Generates a unique **Desk ID** based on your studio location (for example, `MASTER_DUBAI_7A3F`).
- Checks that no other studio in your fleet is using the same ID.
- Registers your desk with ClickFlash Cloud.
- Downloads shared settings: products, session types, pricing tiers, and global config.

**What you see:**
- Your new Desk ID displayed in a box.
- A list of peer studios already in your fleet (if any).
- Status: **"Registered successfully"** with a green checkmark.

> 🌍 **Multi-Studio Owners:** If you already have other ClickFlash studios, they appear here so you know you're connected to the same fleet.

Click **"Continue"**.

---

### Step 6: Studio Profile — Name, Location, Timezone, Currency

Tell ClickFlash about your studio:

| Field | Example | Why it matters |
|-------|---------|---------------|
| **Studio Name** | "Sunset Portraits Dubai" | Appears on receipts and the dashboard |
| **Location** | "Dubai Marina, UAE" | Used for your Desk ID and fleet map |
| **Timezone** | "Asia/Dubai" | Ensures bookings and orders show correct times |
| **Currency** | "AED" (د.إ) | Prices and payments display in this currency |

- The installer **auto-detects your timezone** from your computer settings.
- Choose your currency from the dropdown — we support **20 currencies** including USD, EUR, GBP, AED, SGD, AUD, and more.

Click **"Continue"**.

---

### Step 7: Touch Kiosk Pairing — Auto-Discover or QR Code

The Touch Kiosk is the in-studio tablet or computer where customers browse and order prints.

**Option A: Auto-Discover (Recommended)**
1. Make sure your Touch Kiosk device is on the **same Wi-Fi network** as this computer.
2. The installer scans the network and finds it automatically.
3. You'll see: **"Touch Kiosk found at 192.168.1.100 (12ms latency)"**.
4. Click **"Pair"**.

**Option B: QR Code (For remote or tricky networks)**
1. If auto-discovery doesn't find the kiosk, click **"Show QR Code"**.
2. Open the **ClickFlash Touch** app on the kiosk device.
3. Tap **"Pair with Master"** and scan the QR code displayed in the installer.
4. The devices connect securely over your local network.

> 📶 **Tip:** Both devices must be on the same network. If you have a guest Wi-Fi and staff Wi-Fi, connect both to the staff network.

Click **"Continue"**.

---

### Step 8: Health Check — Verifies All Systems

The installer runs a final 5-point inspection:

| Check | What it tests | Status |
|-------|-------------|--------|
| **Master Backend** | Can the main app start and respond? | ✅ / ❌ |
| **Touch Backend** | Can the kiosk app start and respond? | ✅ / ❌ |
| **Cloud Heartbeat** | Can this desk reach ClickFlash Cloud? | ✅ / ❌ |
| **Database Write** | Can we save orders and settings? | ✅ / ❌ |
| **Photo Storage** | Can we upload to cloud photo storage? | ✅ / ❌ |

- All five checks must show **green** before you finish.
- If any check fails, the installer shows a **detailed error message** and a **"Retry"** button.

> 🛠️ **Common fix:** If the Cloud Heartbeat fails, check your internet connection or firewall. ClickFlash needs outbound HTTPS access (port 443).

Click **"Continue"**.

---

### Step 9: Launch — Master + Touch Start Automatically

🎉 **You're done!**

The installer:
1. Saves all your settings to this computer.
2. Creates desktop and Start Menu shortcuts.
3. Launches **ClickFlash Master Portal** (port 8090).
4. Launches **ClickFlash Touch Kiosk** (port 8091).

**What you see next:**
- The Master Portal opens in your default web browser at `http://localhost:8090`.
- The Touch Kiosk window opens on your screen (or on the paired device).
- A **"Installation Complete"** screen with options to:
  - 🚀 **"Open Master Portal"**
  - 📋 **"Copy Desk ID to Clipboard"**
  - 🌐 **"Open Cloud Dashboard"**

> 💾 **Your data is safe:** All studio data, photos, and settings are preserved even if you close the apps. They will be there when you reopen them.

---

## 🖥️ Silent / Unattended Mode (For IT Admins)

If you are installing ClickFlash across multiple computers in a studio chain, you can run the installer silently from the command line.

### Windows (PowerShell / CMD)

```powershell
# Basic silent install
ClickFlash-Studio-Setup-5.0.0-x64.exe /S

# Silent install with custom directory
ClickFlash-Studio-Setup-5.0.0-x64.exe /S /D=C:\ClickFlash

# Silent install with all options disabled
ClickFlash-Studio-Setup-5.0.0-x64.exe /S /D=C:\ClickFlash /ALLUSERS=1 /CURRENTUSER=0
```

### macOS (Terminal)

```bash
# Mount and copy silently
hdiutil attach ClickFlash-Studio-Setup-5.0.0-x64.dmg
cp -R "/Volumes/ClickFlash Studio Setup/ClickFlash Studio Setup.app" /Applications/
hdiutil detach "/Volumes/ClickFlash Studio Setup"

# Launch with pre-configured settings
/Applications/ClickFlash\ Studio\ Setup.app/Contents/MacOS/ClickFlash\ Studio\ Setup --silent --config=/path/to/studio-config.json
```

### Linux (Terminal)

```bash
# Make executable and run silently
chmod +x ClickFlash-Studio-Setup-5.0.0-x86_64.AppImage
./ClickFlash-Studio-Setup-5.0.0-x86_64.AppImage --silent --config=/path/to/studio-config.json
```

### Pre-Configuration File (`studio-config.json`)

Create this JSON file to skip all wizard steps:

```json
{
  "cloudflareToken": "your-api-token-here",
  "cloudflareAccountId": "your-account-id",
  "studioName": "Sunset Portraits Dubai",
  "location": "Dubai Marina, UAE",
  "country": "AE",
  "timezone": "Asia/Dubai",
  "currency": "AED",
  "deskId": "MASTER_DUBAI_7A3F",
  "installPath": "C:\\ClickFlash",
  "launchOnComplete": true
}
```

> ⚠️ **Security Warning:** Store `studio-config.json` securely and delete it after installation. It contains sensitive API tokens.

---

## 🛠️ Troubleshooting

### ❌ "Port already in use" (System Check Step)

**What it looks like:**
> ⚠️ Port 8090 is already in use by "Skype.exe".

**Fixes:**
1. Close the app using the port (the installer tells you which one).
2. Restart your computer and run the installer again.
3. If you need to keep that app running, manually configure ClickFlash to use different ports after installation (see `settings.json` in the install folder).

---

### ❌ "Cloudflare token invalid" (Cloud Account Step)

**What it looks like:**
> ❌ Token validation failed: "Invalid request headers".

**Fixes:**
1. Double-check you copied the **entire** token — it is long and easy to truncate.
2. Make sure the token has these permissions:
   - `Zone:Read`
   - `Account:Read`
   - `Cloudflare Images:Edit`
3. Try the **OAuth sign-in** option instead — it avoids copy/paste errors entirely.
4. If your Cloudflare account has **2FA**, make sure you are fully logged in before creating the token.

---

### ❌ "Touch Kiosk not found" (Kiosk Pairing Step)

**What it looks like:**
> ❌ No Touch Kiosk found on the local network.

**Fixes:**
1. **Check the Wi-Fi:** Both the Master computer and the Touch Kiosk must be on the **same network**.
2. **Restart the Touch Kiosk app:** Close and reopen it, then click **"Re-scan"** in the installer.
3. **Use QR Code:** Click **"Show QR Code"** and scan it from the kiosk device.
4. **Skip for now:** Click **"Skip Pairing"** and pair later from the Master Portal settings.

---

### ❌ "Health check failures" (Health Check Step)

| Failed Check | Likely Cause | Fix |
|-------------|-------------|-----|
| **Master Backend** | Port blocked by firewall | Allow `localhost:8090` in Windows Firewall / macOS Security |
| **Touch Backend** | Port blocked or kiosk offline | Check kiosk Wi-Fi; allow `localhost:8091` |
| **Cloud Heartbeat** | No internet or proxy blocking | Check internet; if behind a corporate proxy, whitelist `*.clickflash.app` |
| **Database Write** | Disk full or permissions | Free up disk space; run installer as administrator |
| **Photo Storage** | Cloudflare R2 misconfigured | Re-check your Cloudflare token permissions; retry fleet registration |

**General fix for any health check failure:**
1. Click **"Retry"** — sometimes it's a temporary network blip.
2. Check the **log panel** at the bottom of the installer for detailed error messages.
3. If all else fails, click **"Back"** to revisit the relevant step, fix the issue, then return to Health Check.

---

## 🔄 Updating

ClickFlash includes a built-in **auto-updater**. When a new version is available:

1. A notification appears in the Master Portal.
2. Click **"Update Now"** to download and install in the background.
3. Restart the apps when prompted.

**Manual update:**
1. Download the latest installer from [GitHub Releases](https://github.com/clickflash/clickflash-installer/releases).
2. Run it — it will detect your existing installation and update only the changed files.
3. Your data and settings are preserved.

> 🔄 **Version compatibility:** The auto-updater ensures Master Portal and Touch Kiosk stay on the same version. Never mix different versions.

---

## 🗑️ Uninstalling

If you need to remove ClickFlash from this computer:

### Windows
1. Open **Settings** → **Apps** → **Installed apps**.
2. Find **"ClickFlash Studio Setup"**.
3. Click **Uninstall** and confirm.
4. The uninstaller removes apps, shortcuts, and configuration files.

> 💾 **Your data is preserved:** Photos, orders, and studio databases are **not** deleted during uninstall. They remain in your user data folder in case you reinstall later.

### macOS
1. Open **Finder** → **Applications**.
2. Drag **ClickFlash Studio Setup** to the **Trash**.
3. To also remove data: delete `~/Library/Application Support/ClickFlash Studio Setup`.

### Linux
1. Delete the `.AppImage` file.
2. To remove data: delete `~/.config/ClickFlash Studio Setup`.

---

## 📞 Need More Help?

| Resource | Link / Contact |
|----------|---------------|
| **GitHub Issues** | `https://github.com/clickflash/clickflash-installer/issues` |
| **Email Support** | `support@clickflash.app` |
| **Documentation** | `https://docs.clickflash.app` |
| **Community Discord** | `https://discord.gg/clickflash` |

---

**Happy shooting! 📸**

*© 2026 ClickFlash Photography. All rights reserved.*
