# ClickFlash — Troubleshooting Guide

> **For:** Studio Staff, IT Support, Photographers  
> **Version:** 5.0.0  
> **Last Updated:** 2026-06-06

---

## 🔴 Critical Issues (App Won't Start)

### Issue: "Another instance is already running"

**Symptom:** Double-clicking the installer or Master app shows an error about a single-instance lock.

**Cause:** The app is already running in the background (possibly minimized to system tray).

**Fix:**
1. Check the system tray (bottom-right corner of Windows) for a camera icon
2. Right-click the icon and select "Show Window" or "Exit"
3. If no icon is visible, open Task Manager (Ctrl+Shift+Esc)
4. Find "ClickFlash Master" or "ClickFlash Installer" in the Processes tab
5. Click "End Task"
6. Relaunch the app

**Prevention:** Always use the system tray icon to exit the app rather than closing the window.

---

### Issue: "Port 8090 is already in use"

**Symptom:** Master Portal shows "Failed to start server on port 8090" during startup.

**Cause:** Another program is using port 8090, or a previous Master instance didn't shut down cleanly.

**Fix:**
1. Open Command Prompt as Administrator
2. Run: `netstat -ano | findstr :8090`
3. Note the PID (last number in the output)
4. Run: `taskkill /PID <PID> /F`
5. Restart Master Portal

**Alternative Fix:** Change the port in Master settings (Settings → Network → Port).

---

### Issue: "Port 8091 is already in use"

**Symptom:** Touch Kiosk shows "Failed to start server on port 8091" during startup.

**Fix:** Same as port 8090, but use `:8091` in the netstat command.

---

### Issue: "SQLite database is locked"

**Symptom:** App shows error about database being locked, or operations time out.

**Cause:** Another process is holding the database file open, or the app crashed while writing.

**Fix:**
1. Close all ClickFlash apps (Master, Touch, Installer)
2. Navigate to the data directory:
   - Windows: `%LOCALAPPDATA%\ClickFlash\Master\pb_data\`
   - macOS: `~/Library/Application Support/ClickFlash/Master/pb_data/`
3. Look for files ending in `-wal` or `-shm`
4. If the main `.db` file is very small but the `-wal` file is large, the WAL needs to be checkpointed
5. Restart the app — it will automatically recover

**If still broken:**
1. Make a backup of the entire `pb_data` folder
2. Delete the `-wal` and `-shm` files
3. Restart the app
4. If data is missing, restore from the backup and contact support

---

## 🟡 Sync Issues

### Issue: "Touch Kiosk cannot find Master Portal"

**Symptom:** Touch shows "Searching for Master..." indefinitely or "No Master found on network."

**Cause:** mDNS discovery is blocked by firewall, router, or the apps are on different networks.

**Fix — Automatic (mDNS):**
1. Ensure both Master and Touch are on the **same Wi-Fi or Ethernet network**
2. Check Windows Firewall:
   - Open Windows Defender Firewall → Allow an app through firewall
   - Ensure "ClickFlash Master" and "ClickFlash Touch" are checked for Private networks
3. Restart both apps

**Fix — Manual (IP Address):**
1. On the Master computer, open Command Prompt
2. Run: `ipconfig` and note the IPv4 address (e.g., `192.168.1.100`)
3. On the Touch Kiosk, go to Settings → Manual Pairing
4. Enter the Master's IP address and port `8090`
5. Click "Connect"

**Fix — QR Code:**
1. On Master Portal, go to Settings → Pairing → Show QR Code
2. On Touch Kiosk, go to Settings → Pairing → Scan QR Code
3. Hold the Touch device's camera up to the QR code on the Master screen

---

### Issue: "Cloud sync is offline"

**Symptom:** Master shows "Cloud Sync: Offline" in the status bar, or the Management Hub doesn't show the studio in the fleet dashboard.

**Cause:** Internet is down, Cloudflare token expired, or firewall is blocking HTTPS.

**Fix:**
1. Check internet connection (open a web browser, visit google.com)
2. If internet works, check the Cloudflare token:
   - Master Portal → Settings → Cloudflare → Test Connection
   - If it fails, re-run the installer wizard or re-enter the token
3. Check Windows Firewall for outbound HTTPS (port 443) — should be allowed by default
4. If behind a corporate proxy, configure proxy settings in Master Portal → Settings → Network

**Note:** The studio can operate fully offline. Cloud sync is only needed for fleet management and gallery uploads. Orders, photos, and albums work normally without internet.

---

### Issue: "Orders from Touch not appearing in Master"

**Symptom:** Customers place orders on the Touch Kiosk, but they don't show up in Master Portal.

**Cause:** The Touch lost connection to Master while the order was being placed, or the sync queue is backed up.

**Fix:**
1. Check Touch Kiosk status bar — it should show "Connected to Master" or "Queued: X orders"
2. If it shows "Queued", wait 30 seconds and check Master again
3. If still missing, restart the Touch Kiosk app
4. On restart, it will automatically sync all queued orders

**Verify:**
1. In Master Portal, go to Orders → Kiosk Orders
2. Look for orders with a "cloud offline" icon — these were queued and synced later

---

## 🟠 Performance Issues

### Issue: "App is very slow / laggy"

**Symptom:** Clicking buttons takes seconds to respond, or the app freezes.

**Cause:** Large photo library, low disk space, or memory leak from long uptime.

**Fix:**
1. **Check disk space:**
   - Open File Explorer → This PC
   - Ensure the C: drive has at least 5GB free
   - If low, run Money Trash to delete old photos, or move them to external storage

2. **Check memory usage:**
   - Open Task Manager → Performance → Memory
   - If memory is above 85%, close other applications

3. **Restart the app:**
   - Exit Master Portal completely (system tray → Exit)
   - Relaunch — this clears any memory leaks

4. **Enable photo thumbnail cache:**
   - Master Portal → Settings → Performance → Enable Thumbnail Cache
   - This reduces CPU usage when browsing large albums

---

### Issue: "Photos take forever to load"

**Symptom:** Clicking an album shows blank thumbnails for a long time.

**Cause:** High-resolution RAW files are being processed on-the-fly, or the photo directory is on a slow network drive.

**Fix:**
1. Ensure photos are stored on a local SSD or fast external drive
2. Avoid storing photos on network drives (NAS) for active albums
3. Enable "Pre-generate thumbnails" in Settings → Performance
4. For very large albums (1000+ photos), use the "Lazy Load" option

---

## 🔵 Installation Issues

### Issue: "Installer says 'Node.js not found'"

**Symptom:** The 1-click installer shows a red X next to "Node.js" in the prerequisites step.

**Cause:** Node.js is not installed, or the installer can't find it.

**Fix:**
1. The installer will offer to download and install Node.js automatically — click "Install Node.js"
2. If automatic install fails:
   - Visit https://nodejs.org
   - Download the LTS version (20.x or higher)
   - Run the installer with default settings
   - Restart the ClickFlash Installer

---

### Issue: "Firewall is blocking the app"

**Symptom:** Installer shows a warning about Windows Firewall, or apps can't communicate.

**Fix:**
1. The installer will attempt to add firewall rules automatically
2. If it fails, add rules manually:
   - Windows Defender Firewall → Advanced Settings → Inbound Rules
   - Click "New Rule" → Program → Browse to `ClickFlash-Master.exe`
   - Allow the connection → Check "Private" → Name it "ClickFlash Master"
   - Repeat for `ClickFlash-Touch.exe`
3. Also add outbound rules for the same programs (usually allowed by default)

**Required Ports:**
- 8090 (Master Portal)
- 8091 (Touch Kiosk)
- 5353 (mDNS discovery — UDP)
- 5175 (Installer dev server — only during setup)

---

### Issue: "Cloudflare token is invalid"

**Symptom:** Installer shows "Token validation failed" or "Account not found."

**Cause:** The token was copied incorrectly, expired, or doesn't have the right permissions.

**Fix:**
1. In the installer, click "Re-authenticate with Cloudflare"
2. This will open a browser window for OAuth login
3. Log in with your Cloudflare account
4. Grant permissions for D1, R2, Workers, and Pages
5. The installer will automatically capture the new token

**Manual Fix:**
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Create a new token with these permissions:
   - Account: Cloudflare Workers:Edit
   - Account: D1:Edit
   - Account: R2:Edit
   - Zone: Page Rules:Edit
   - Zone: Zone:Read
3. Copy the token and paste it into the installer

---

## 🟣 Data & Recovery Issues

### Issue: "I accidentally deleted an album / photo / order"

**Symptom:** Important data was deleted and needs to be recovered.

**Fix:**
1. **Check the Recycle Bin / Trash:**
   - Deleted photos are moved to Money Trash before permanent deletion
   - Open Money Trash from the system tray or Master Portal → Tools → Money Trash
   - Find the item and click "Restore"

2. **Check backups:**
   - Master Portal automatically creates daily backups
   - Go to Settings → Backup → Restore from Backup
   - Select a backup from before the deletion
   - Choose what to restore (albums, orders, settings)

3. **If no backup exists:**
   - Stop using the app immediately to prevent overwriting
   - Contact ClickFlash Support with the approximate deletion time
   - Support may be able to recover from WAL files or R2 archive

---

### Issue: "Database corruption error"

**Symptom:** App shows "SQLite database is malformed" or crashes on startup.

**Fix:**
1. The app will attempt automatic repair on startup
2. If automatic repair fails:
   - Close the app
   - Navigate to the data directory (see "SQLite database is locked" above)
   - Make a backup of `master.db`
   - Delete `master.db` and rename the most recent backup file to `master.db`
   - Restart the app

3. **If no backups exist:**
   - The WAL file (`master.db-wal`) may contain recoverable data
   - Contact ClickFlash Support — do not delete the WAL file

---

### Issue: "GDPR data export request"

**Symptom:** A customer has requested a copy of all their data (GDPR Right to Access).

**Fix:**
1. Master Portal → Settings → GDPR → Data Export
2. Enter the customer's email address or order ID
3. Click "Generate Export"
4. The system will compile:
   - All photos associated with the customer
   - All orders and payment records
   - Consent logs and communication history
5. Download the ZIP file and send it to the customer within 30 days

---

### Issue: "GDPR data deletion request"

**Symptom:** A customer has requested deletion of all their data (GDPR Right to Erasure).

**Fix:**
1. Master Portal → Settings → GDPR → Data Erasure
2. Enter the customer's email address or order ID
3. Review the list of data to be deleted
4. Check "I confirm this deletion is irreversible"
5. Click "Permanently Delete"
6. The action is logged in the audit trail for compliance

**Note:** This deletes local data AND queues a deletion request for cloud data. The cloud deletion happens within 24 hours.

---

## 🟢 Common Questions

### Q: Can I run Master and Touch on the same computer?

**A:** Yes, but not recommended for production. They use different ports (8090 and 8091) so they won't conflict. For testing or small studios, this is fine. For production, use separate computers so customers don't see the Master interface.

---

### Q: Do I need internet to use ClickFlash?

**A:** No. Master Portal and Touch Kiosk work fully offline. Internet is only needed for:
- Cloud sync to Management Hub (optional)
- Gallery uploads for customer online viewing (optional)
- Stripe payment processing (if using cards)
- Email delivery (optional — emails queue when offline)

---

### Q: How do I update ClickFlash?

**A:** Updates are automatic:
1. The app checks for updates every 30 minutes
2. When an update is available, a notification appears
3. Click "Install Update" — the app will download, install, and restart
4. Or enable "Silent Updates" in Settings → Updates to install automatically on next quit

**Manual Update:**
1. Download the latest installer from the ClickFlash website
2. Run it — it will detect the existing installation and update it
3. Your data and settings are preserved

---

### Q: How do I add a new Touch Kiosk?

**A:**
1. Install ClickFlash Touch on the new device
2. Ensure it's on the same network as Master Portal
3. The Touch will automatically discover the Master via mDNS
4. If auto-discovery fails, use QR code or manual IP entry (see "Touch cannot find Master" above)
5. The Master will show a pairing request — click "Approve"

---

### Q: Can I use ClickFlash at multiple locations?

**A:** Yes — this is the multi-master fleet feature in v5.0:
1. Each location gets its own Master Portal
2. During setup, the installer registers each location with the Cloudflare Management Hub
3. The Management Hub shows all locations in the Fleet Dashboard
4. Data syncs between locations automatically when online
5. Each location operates independently when offline

---

### Q: What happens if my computer crashes during a wedding?

**A:** Your data is safe:
1. SQLite uses WAL (Write-Ahead Logging) — transactions are durable even if the app crashes
2. On restart, the app replays the WAL and recovers to the last committed state
3. Orders created on Touch Kiosk are stored in IndexedDB (browser storage) and sync to Master when reconnected
4. Photos are stored on disk — they are not affected by app crashes

**Best Practice:** Enable automatic backups in Settings → Backup → Daily Backups.

---

## 📞 Support Escalation

| Issue Severity | Response Time | Contact |
|---------------|--------------|---------|
| **SEV 1** — App completely down, can't take orders | 15 minutes | Emergency hotline |
| **SEV 2** — Major feature broken (sync, payments) | 1 hour | Support ticket |
| **SEV 3** — Minor issue (UI glitch, slow performance) | 24 hours | Support ticket |
| **SEV 4** — Question or feature request | 72 hours | Community forum |

**When contacting support, include:**
1. App version (Settings → About)
2. Operating system and version
3. Error message (screenshot or exact text)
4. Steps to reproduce
5. Recent changes (updates, new hardware, network changes)
6. Log file location:
   - Windows: `%TEMP%\clickflash-installer.log` or `%LOCALAPPDATA%\ClickFlash\Master\logs\main.log`
   - macOS: `~/Library/Logs/ClickFlash/`

---

*End of Troubleshooting Guide*
