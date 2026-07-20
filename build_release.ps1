$ErrorActionPreference = "Stop"

Write-Host "============================================"
Write-Host "  ClickFlash v2.0.0 - Full Release Rebuild"
Write-Host "============================================"
Write-Host ""

# ── Step 0: Clean old release directory ──
$releaseDir = "C:\Users\alamo\Desktop\ClickFlash\ClickFlash_Release_v2.0"
$zipPath = "C:\Users\alamo\Desktop\ClickFlash\ClickFlash_v2.0.0-production.zip"

Write-Host "[0/6] Cleaning old release directory..."
if (Test-Path $releaseDir) { Remove-Item -Path $releaseDir -Recurse -Force }
if (Test-Path $zipPath)    { Remove-Item -Path $zipPath -Force }

# Create fresh structure
New-Item -ItemType Directory -Path "$releaseDir\01_Installer" -Force | Out-Null
New-Item -ItemType Directory -Path "$releaseDir\02_Master_and_Touch" -Force | Out-Null
New-Item -ItemType Directory -Path "$releaseDir\03_License_and_MoneyTrash" -Force | Out-Null
New-Item -ItemType Directory -Path "$releaseDir\04_Assets_and_Config" -Force | Out-Null
New-Item -ItemType Directory -Path "$releaseDir\05_Manuals" -Force | Out-Null
Write-Host "  -> Done."

# ── Step 1: Build Installer ──
Write-Host ""
Write-Host "[1/5] Building Installer Wizard..."
pnpm --filter clickflash-installer run package:installer
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Installer build failed!" ; exit 1 }
Write-Host "  -> Installer built successfully."

# ── Step 2: Build Master Portal ──
Write-Host ""
Write-Host "[2/5] Building Master Portal..."
pnpm --filter clickflash-master run package:installer
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Master build failed!" ; exit 1 }
Write-Host "  -> Master built successfully."

# ── Step 3: Build Touch Kiosk ──
Write-Host ""
Write-Host "[3/5] Building Touch Kiosk..."
pnpm --filter clickflash-touch run build:electron
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Touch build failed!" ; exit 1 }
Write-Host "  -> Touch built successfully."

# ── Step 4: Build License Generator ──
Write-Host ""
Write-Host "[4/5] Building License Generator..."
pnpm --filter clickflash-license-generator run package:win
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: License Generator build failed!" ; exit 1 }
Write-Host "  -> License Generator built successfully."

# ── Step 5: Build MoneyTrash (Tauri) ──
Write-Host ""
Write-Host "[5/5] Building MoneyTrash Ingestor (Tauri)..."
pnpm --filter moneytrash-uploader run tauri:build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: MoneyTrash build failed!" ; exit 1 }
Write-Host "  -> MoneyTrash built successfully."

# ── Step 6: Assemble Release ──
Write-Host ""
Write-Host "[6/6] Assembling release package..."

# Copy Installer
Copy-Item -Path "apps\installer\release\ClickFlash-Studio-Setup-*.exe" -Destination "$releaseDir\01_Installer" -Force -ErrorAction SilentlyContinue

# Copy Master and Touch
Copy-Item -Path "apps\master\release\ClickFlash Master OS Setup *.exe" -Destination "$releaseDir\02_Master_and_Touch" -Force -ErrorAction SilentlyContinue
Copy-Item -Path "apps\touch\release\ClickFlash - Touch Kiosk Setup *.exe" -Destination "$releaseDir\02_Master_and_Touch" -Force -ErrorAction SilentlyContinue

# Copy License Generator
Copy-Item -Path "apps\license-generator\release\ClickFlash License Generator Setup *.exe" -Destination "$releaseDir\03_License_and_MoneyTrash" -Force -ErrorAction SilentlyContinue

# Copy MoneyTrash
Copy-Item -Path "apps\moneytrash\src-tauri\target\release\bundle\msi\*.msi" -Destination "$releaseDir\03_License_and_MoneyTrash" -Force -ErrorAction SilentlyContinue
Copy-Item -Path "apps\moneytrash\src-tauri\target\release\bundle\nsis\*.exe" -Destination "$releaseDir\03_License_and_MoneyTrash" -Force -ErrorAction SilentlyContinue

# Copy Assets and Configs
if (Test-Path "apps\master\backend\.env.example") {
    Copy-Item -Path "apps\master\backend\.env.example" -Destination "$releaseDir\04_Assets_and_Config" -Force
}
$schemaFile = Get-ChildItem -Path "apps\master\backend" -Recurse -Filter "schema.sql" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($schemaFile) {
    Copy-Item -Path $schemaFile.FullName -Destination "$releaseDir\04_Assets_and_Config" -Force
}
# Also copy the cloud worker schema
if (Test-Path "workers\management-worker\schema.sql") {
    Copy-Item -Path "workers\management-worker\schema.sql" -Destination "$releaseDir\04_Assets_and_Config\schema_cloud.sql" -Force
}

# Generate README
$readmeContent = @"
# ClickFlash v2.0.0 - Release Package

## Contents

| Folder | Description |
|--------|-------------|
| ``01_Installer`` | ClickFlash Studio Setup wizard |
| ``02_Master_and_Touch`` | Master Portal & Touch Kiosk installers |
| ``03_License_and_MoneyTrash`` | License Generator & MoneyTrash Uploader |
| ``04_Assets_and_Config`` | Environment config examples & DB schemas |
| ``05_Manuals`` | User documentation |

## Quick Start

1. Run the installer from ``01_Installer``
2. Configure using the ``.env.example`` template in ``04_Assets_and_Config``
3. Launch Master Portal and Touch Kiosk from ``02_Master_and_Touch``

## Build Date
$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss UTC')
"@
Set-Content -Path "$releaseDir\README.md" -Value $readmeContent -Force
Set-Content -Path "$releaseDir\05_Manuals\README.md" -Value "# ClickFlash v2.0.0 - User Manual`n`nDetailed user documentation to be provided." -Force

Write-Host "  -> Assembly complete."

# ── Step 6.5: Code Signing ──
Write-Host ""
Write-Host "[Signing] Authenticode signing all executables..."
if (Test-Path "scripts\sign-release.ps1") {
    .\scripts\sign-release.ps1 -TargetDirectory $releaseDir
    if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Code signing failed!" ; exit 1 }
} else {
    Write-Host "WARNING: sign-release.ps1 not found, skipping code signing." -ForegroundColor Yellow
}

# ── Step 7: Create Zip ──
Write-Host ""
Write-Host "Creating final archive: ClickFlash_v2.0.0-production.zip..."
Compress-Archive -Path "$releaseDir\*" -DestinationPath $zipPath -Force
Write-Host "  -> Archive created successfully."

# ── Summary ──
Write-Host ""
Write-Host "============================================"
Write-Host "  BUILD COMPLETE"
Write-Host "============================================"
Write-Host ""
Write-Host "Release directory: $releaseDir"
Write-Host "Archive: $zipPath"
Write-Host ""
Get-ChildItem -Path $releaseDir -Recurse -File | ForEach-Object {
    $sizeKB = [math]::Round($_.Length / 1KB, 1)
    $sizeMB = [math]::Round($_.Length / 1MB, 1)
    $display = if ($sizeMB -ge 1) { "${sizeMB} MB" } else { "${sizeKB} KB" }
    Write-Host ("  {0,-60} {1,10}" -f $_.FullName.Replace($releaseDir + "\", ""), $display)
}
Write-Host ""
$zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)
Write-Host "Total archive size: ${zipSize} MB"
