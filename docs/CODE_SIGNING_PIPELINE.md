# ClickFlash Code Signing Pipeline

> **Status:** Ready for implementation
> **Priority:** HIGH (blocks auto-updater)
> **Cost:** ~$200/year

---

## 🔐 WHY CODE SIGNING IS REQUIRED

| Without Signing | With Signing |
|----------------|-------------|
| Windows SmartScreen warning | Silent installation |
| "Unknown publisher" warning | Shows "ClickFlash Studio" |
| Auto-updater blocked | Auto-updater works |
| Users scared to install | Professional appearance |
| Antivirus false positives | Trusted by Windows |

---

## 📋 CERTIFICATE OPTIONS

### Option 1: Standard Code Signing (Recommended)

| Provider | Price | Validation Time | Features |
|----------|-------|----------------|----------|
| **DigiCert** | $474/year | 1-3 days | EV available, trusted |
| **Sectigo** | $200/year | 1-2 days | Standard, affordable |
| **SSL.com** | $129/year | 1-2 days | Budget option |
| **Certum** | $69/year | 3-5 days | European, cheapest |

**Recommendation:** Sectigo Standard Code Signing
- Good balance of price and trust
- Recognized by Windows SmartScreen
- Supports SHA-256

### Option 2: Extended Validation (EV) Code Signing

| Provider | Price | Benefits |
|----------|-------|----------|
| DigiCert EV | $699/year | Immediate SmartScreen reputation |
| Sectigo EV | $349/year | Higher trust level |

**EV Benefits:**
- No SmartScreen warnings from day 1
- Blue address bar in some contexts
- Higher trust for enterprise customers

---

## 🛠️ IMPLEMENTATION STEPS

### Step 1: Purchase Certificate

```bash
# 1. Go to Sectigo website
# 2. Select "Standard Code Signing"
# 3. Complete organization validation:
#    - Business registration documents
#    - Phone verification
#    - Domain ownership proof
# 4. Receive certificate files
```

### Step 2: Install Certificate

```powershell
# Windows - Import PFX certificate
# Certificate will be delivered as .p12 or .pfx file

# Method 1: Import to Windows Certificate Store
$certPath = "C:\certs\clickflash.p12"
$password = ConvertTo-SecureString "YourPassword" -AsPlainText -Force
Import-PfxCertificate -FilePath $certPath -CertStoreLocation Cert:\CurrentUser\My -Password $password

# Method 2: Use directly in electron-builder
# Store as environment variable
```

### Step 3: Configure Electron Builder

```yaml
# electron-builder.yml - Add signing configuration
win:
  target:
    - nsis
  # Code signing
  certificateFile: "C:\\certs\\clickflash.p12"
  certificatePassword: "${env.CERT_PASSWORD}"
  signAndEditExecutable: true
  
  # Additional signing options
  signingHashAlgorithms:
    - sha256
  
  # Verify signature after signing
  verifyUpdateCodeSignature: true
  
  # Publisher info (shown in Windows)
  publisherName: "ClickFlash Studio"

# Environment variables (DO NOT COMMIT)
# .env.local
CERT_PASSWORD=your_secure_password_here
```

### Step 4: CI/CD Pipeline

```yaml
# .github/workflows/build-and-sign.yml
name: Build and Sign

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: windows-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Import certificate
        shell: powershell
        run: |
          $certBytes = [Convert]::FromBase64String("${{ secrets.CERT_BASE64 }}")
          [IO.File]::WriteAllBytes("C:\\cert.p12", $certBytes)
          
      - name: Build and sign
        env:
          CERT_PASSWORD: ${{ secrets.CERT_PASSWORD }}
        run: |
          npm run build:backend
          npm run build
          npm run build:electron
          npm run package:installer
          
      - name: Upload to GitHub Releases
        uses: softprops/action-gh-release@v1
        with:
          files: |
            release/*.exe
            release/*.blockmap
            release/latest.yml
```

### Step 5: GitHub Secrets

```bash
# Add these secrets to GitHub repository:
# Settings → Secrets and variables → Actions

CERT_BASE64     # Base64-encoded .p12 certificate
CERT_PASSWORD   # Certificate password
```

---

## 🔧 LOCAL BUILD SCRIPT

```powershell
# scripts/sign-and-build.ps1
param(
    [string]$CertPath = "C:\certs\clickflash.p12",
    [string]$CertPassword = $env:CERT_PASSWORD
)

Write-Host "=== ClickFlash Code Signing Build ===" -ForegroundColor Cyan

# Verify certificate exists
if (-not (Test-Path $CertPath)) {
    Write-Error "Certificate not found: $CertPath"
    exit 1
}

# Set environment variable for electron-builder
$env:CERT_PASSWORD = $CertPassword

# Build all apps
$apps = @("master", "touch", "installer")

foreach ($app in $apps) {
    Write-Host "\nBuilding $app..." -ForegroundColor Yellow
    
    Set-Location "..\apps\$app"
    
    # Build
    npm run build:backend
    npm run build
    npm run build:electron
    
    # Sign and package
    npm run package:installer
    
    Set-Location "..\.."
}

Write-Host "\n✅ All apps built and signed!" -ForegroundColor Green
```

---

## ✅ VERIFICATION

### Verify Signature

```powershell
# Check if EXE is properly signed
Get-AuthenticodeSignature "release\ClickFlash Master OS Setup 4.2.0.exe"

# Expected output:
# SignerCertificate                         Status                    Path
# -----------------                         ------                    ----
# [Thumbprint]                              Valid                     ClickFlash Master OS Setup...
```

### Test on Clean VM

```powershell
# 1. Create Windows 10/11 VM
# 2. Copy EXE to VM
# 3. Double-click EXE
# 4. Verify:
#    - No SmartScreen warning
#    - Shows "ClickFlash Studio" as publisher
#    - Installation completes successfully
```

---

## 📊 TIMELINE

| Step | Duration | Dependencies |
|------|----------|-------------|
| Purchase certificate | 1 day | Budget approval |
| Organization validation | 2-3 days | Business docs |
| Install and test | 2 hours | Certificate received |
| CI/CD integration | 4 hours | GitHub secrets |
| Full pipeline test | 2 hours | All above |
| **Total** | **3-5 days** | |

---

## 💰 COST BREAKDOWN

| Item | Cost | Frequency |
|------|------|-----------|
| Sectigo Standard Cert | $200 | Annual |
| GitHub Actions minutes | $0 | Included |
| Azure VM for testing | $5 | Per test |
| **Total first year** | **$205** | |

---

## 🎯 SUCCESS CRITERIA

- [ ] EXE installs without SmartScreen warning
- [ ] Publisher shows "ClickFlash Studio"
- [ ] Auto-updater works without prompts
- [ ] Antivirus doesn't flag the installer
- [ ] Windows Defender allows installation

---

**Next: Purchase certificate → Install → Test → Enable auto-updater**
