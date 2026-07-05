# ClickFlash v5.0 — Quick Start Card

> **One-page reference for studio staff**  
> **Print this and keep it at the front desk**

---

## 🚀 First-Time Setup (10 Minutes)

### Step 1: Run the Installer
```
Double-click → ClickFlash-Studio-Setup-5.0.0.exe
```
- Click "Yes" on the Windows UAC prompt
- The wizard opens automatically

### Step 2: Follow the Wizard (7 Steps)
| Step | What You Do | Time |
|------|-------------|------|
| 1. Welcome | Click "Get Started" | 5 sec |
| 2. Prerequisites | Wait for checks to pass (auto) | 30 sec |
| 3. Cloudflare | Click "Sign In with Cloudflare" → approve in browser | 1 min |
| 4. Studio Profile | Enter studio name, city, timezone | 30 sec |
| 5. Pairing | Wait for Touch Kiosk to appear → click "Pair" | 1 min |
| 6. Health Check | Wait for all checks to pass (auto) | 30 sec |
| 7. Complete | Click "Launch ClickFlash Studio" | 5 sec |

**Total: ~4 minutes of your time, ~10 minutes total**

---

## 🖥️ Daily Operation

### Start of Day
```
1. Turn on the Master computer
2. ClickFlash Master Portal starts automatically
3. Turn on the Touch Kiosk tablet/computer
4. Touch Kiosk connects automatically (green dot in corner)
```

### Taking Photos
```
1. In Master Portal, click "New Album" → enter customer name
2. Take photos — they appear in the album automatically
3. Click "Publish to Kiosk" when ready for customer viewing
```

### Customer Orders
```
1. Customer browses photos on Touch Kiosk
2. Customer taps favorites → taps "Order"
3. Order appears instantly in Master Portal → Orders tab
4. Process payment (cash/card) in Master Portal
5. Print receipt
```

### End of Day
```
1. Master Portal → Reports → Daily Summary
2. Review orders, revenue, and photo count
3. Close Master Portal (system tray → Exit)
4. Close Touch Kiosk
```

---

## 🔧 Common Tasks

### Add a New Touch Kiosk
```
Master Portal → Settings → Pairing → Show QR Code
Touch Kiosk → Settings → Scan QR Code → point camera at QR
```

### Change Studio Name or Location
```
Master Portal → Settings → Studio Profile → Edit → Save
Changes sync to cloud automatically
```

### Check Cloud Sync Status
```
Look at the status bar (bottom of Master Portal):
🟢 Green = Synced | 🟡 Yellow = Syncing | 🔴 Red = Offline
```

### Run a Backup Now
```
Master Portal → Settings → Backup → Create Backup Now
Backups are saved to: Documents\ClickFlash\Backups
```

### Update ClickFlash
```
Automatic — a notification appears when an update is available
Click "Install Update" → app restarts → done
```

---

## 🆘 If Something Goes Wrong

| Problem | Quick Fix |
|---------|-----------|
| Touch can't find Master | Same Wi-Fi? → Restart both apps → Use QR code |
| Orders not appearing | Check Touch status bar → Restart Touch → Orders queue automatically |
| App won't start | Task Manager → End "ClickFlash" → Restart |
| Photos not showing | Check album is "Published" → Refresh (Ctrl+R) |
| Cloud sync offline | Check internet → Settings → Cloudflare → Test Connection |
| Forgot admin PIN | Contact studio manager — PIN is set during installation |

**Full troubleshooting:** See `TROUBLESHOOTING.md` or press F1 in any app

---

## 📞 Support

| Severity | Example | Contact | Response |
|----------|---------|---------|----------|
| **URGENT** | Can't take orders during event | Emergency hotline | 15 min |
| **High** | Sync broken, can't see cloud data | Support ticket | 1 hour |
| **Normal** | UI glitch, slow performance | Support ticket | 24 hours |
| **Question** | How do I...? | Community forum | 72 hours |

**Include when contacting support:**
- App version (Settings → About)
- What you were doing when the problem happened
- Screenshot of any error message

---

## 🔐 Security Reminders

- **Never share your Cloudflare token** — it's like a master password
- **Lock the Touch Kiosk** when unattended (Admin shortcut: Ctrl+Alt+Shift+X)
- **Log out of Master Portal** at end of day (system tray → Exit)
- **Back up daily** — automatic backups are enabled by default
- **GDPR:** Customer data export/deletion requests → Settings → GDPR

---

## 📊 Key Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + N` | New Album |
| `Ctrl + P` | Publish Album to Kiosk |
| `Ctrl + R` | Refresh |
| `F1` | Help |
| `Ctrl + Shift + X` | Unlock Kiosk (admin) |
| `Ctrl + Alt + Shift + X` | Emergency Kiosk Unlock |

---

*Print this card and laminate it for the front desk.*  
*Full documentation: See `ONE-CLICK-INSTALL.md`, `TROUBLESHOOTING.md`, `SETUP.md`*

---

**ClickFlash v5.0.0** | **Multi-Master Global Sync** | **Offline-First**
