# Kiosk Deployment Guide

## Touch Kiosk Deployment Reference

### System Requirements

#### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | Intel Celeron / AMD A4 | Intel Core i5 / AMD Ryzen 5 |
| RAM | 4 GB | 8 GB |
| Storage | 128 GB SSD | 256 GB SSD |
| Display | 1920x1080 | 3840x2160 (4K) |
| Touch | Single-touch | 10-point multi-touch |
| Network | 100 Mbps Ethernet | 1 Gbps Ethernet |
| Camera | 720p | 1080p (for face login) |

#### Supported Operating Systems

- Windows 10 IoT Enterprise
- Windows 11 Pro/Enterprise
- macOS 12+ (development only)

### Installation

#### 1. Download Installer

```bash
# Download latest release from GitHub
curl -LO https://github.com/clickflash/releases/latest/download/ClickFlash-Touch-Setup.exe

# Verify checksum
sha256sum ClickFlash-Touch-Setup.exe
```

#### 2. Run Installation

```powershell
# Run as Administrator
Start-Process -FilePath ".\ClickFlash-Touch-Setup.exe" -Verb RunAs

# Installation options:
# - Install Location: C:\Program Files\ClickFlash\Touch
# - Auto-start: Enabled
# - Kiosk Mode: Enabled
# - Network Port: 8091
```

#### 3. Post-Installation Configuration

```powershell
# Configure via command line
& "C:\Program Files\ClickFlash\Touch\configure.exe" `
    --server-url "http://master.local:8090" `
    --kiosk-id "KIOSK-LOBBY-01" `
    --enable-rfid `
    --enable-face-login
```

### Network Configuration

#### Port Requirements

| Port | Protocol | Direction | Purpose |
|------|----------|-----------|---------|
| 8091 | HTTP | Inbound | Touch Kiosk UI |
| 8090 | HTTP | Outbound | Master Portal API |
| 443 | HTTPS | Outbound | Cloud Services |
| 123 | NTP | Outbound | Time Sync |

#### Firewall Rules (Windows Firewall)

```powershell
# Create inbound rule for Touch Kiosk
New-NetFirewallRule -DisplayName "ClickFlash Touch" `
    -Direction Inbound -Protocol TCP -LocalPort 8091 `
    -Action Allow -Profile Any

# Create outbound rules for Master communication
New-NetFirewallRule -DisplayName "ClickFlash Master" `
    -Direction Outbound -Protocol TCP -RemotePort 8090 `
    -Action Allow -RemoteAddress 192.168.1.0/24
```

### Kiosk Configuration

#### Settings File (`config.json`)

```json
{
  "kioskId": "KIOSK-LOBBY-01",
  "serverUrl": "http://master.local:8090",
  "network": {
    "dhcp": true,
    "staticIp": null,
    "dns": ["8.8.8.8", "8.8.4.4"]
  },
  "display": {
    "resolution": "1920x1080",
    "orientation": "landscape",
    "rotation": 0,
    "screensaverTimeout": 300
  },
  "features": {
    "enableRfid": true,
    "enableFaceLogin": false,
    "enablePhotoExport": true,
    "enablePrinting": false
  },
  "sync": {
    "intervalSeconds": 30,
    "wifiOnly": false,
    "bandwidthLimit": 0
  }
}
```

### Master Pairing

#### QR Code Pairing Process

1. Boot Touch Kiosk
2. Navigate to Settings > Network > Pair with Master
3. Scan QR code displayed on Master Portal
4. Confirm pairing request on Master
5. Wait for configuration sync

#### Manual Pairing

```bash
# On Touch Kiosk
& "C:\Program Files\ClickFlash\Touch\configure.exe" --pair "MASTER-ABC123"

# On Master Portal
# Settings > Kiosks > Add Kiosk > Enter pairing code: ABC123
```

### Offline Operation

#### Enable Offline Mode

```json
{
  "offline": {
    "enabled": true,
    "queueOrders": true,
    "queuePhotos": false,
    "maxQueueSize": 1000
  }
}
```

#### Sync When Online

The kiosk automatically syncs when connectivity is restored:
- Orders queued during offline are pushed to Master
- Album metadata is refreshed
- Photo selections are synchronized

### Maintenance

#### Remote Updates

```powershell
# Check for updates
& "C:\Program Files\ClickFlash\Touch\update.exe" --check

# Install updates
& "C:\Program Files\ClickFlash\Touch\update.exe" --install

# View update logs
Get-Content "C:\Program Files\ClickFlash\Touch\logs\update.log"
```

#### Manual Data Clear

```powershell
# Clear local cache (keeps orders)
& "C:\Program Files\ClickFlash\Touch\configure.exe" --clear-cache

# Full reset (removes all local data)
& "C:\Program Files\ClickFlash\Touch\configure.exe" --factory-reset
```

### Troubleshooting

#### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Cannot connect to Master | Wrong IP | Check server URL in config |
| Touch not responding | Screensaver active | Adjust timeout in settings |
| Camera not detected | Driver missing | Install from manufacturer |
| RFID reader not working | COM port conflict | Check device manager |
| Offline indicator stays red | Network issue | Check firewall rules |

#### Diagnostic Commands

```powershell
# View system status
& "C:\Program Files\ClickFlash\Touch\diagnose.exe" --status

# Test network connectivity
& "C:\Program Files\ClickFlash\Touch\diagnose.exe" --network

# View logs
& "C:\Program Files\ClickFlash\Touch\diagnose.exe" --logs

# Export diagnostics
& "C:\Program Files\ClickFlash\Touch\diagnose.exe" --export "C:\Temp\diagnostics.zip"
```

### Security

#### Disable Windows Shortcuts (Kiosk Lockdown)

```json
{
  "kiosk": {
    "disableAltTab": true,
    "disableAltF4": true,
    "disableCtrlEsc": true,
    "disableWindowsKey": true,
    "disableTaskbar": true
  }
}
```

#### Auto-Logout

```json
{
  "session": {
    "idleTimeout": 300,
    "autoLogout": true,
    "logoutUrl": "/welcome"
  }
}
```

### Monitoring

#### Health Check Endpoint

```
GET http://localhost:8091/api/health

Response:
{
  "status": "healthy",
  "version": "4.2.0",
  "uptime": 86400,
  "lastSync": "2026-03-31T10:00:00Z",
  "offlineQueue": 0
}
```

#### Remote Monitoring (via Master)

The Master Portal can monitor kiosk health:
- Real-time connection status
- CPU/Memory usage
- Sync status
- Error logs

### Uninstall

```powershell
# Standard uninstall
& "C:\Program Files\ClickFlash\Touch\uninstall.exe"

# Force uninstall (removes all data)
& "C:\Program Files\ClickFlash\Touch\uninstall.exe" --force --remove-data
```
