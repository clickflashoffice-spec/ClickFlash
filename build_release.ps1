$ErrorActionPreference = "Stop"

Write-Host "Building Installer..."
pnpm --filter clickflash-installer run package:installer

Write-Host "Building Master Portal..."
pnpm --filter clickflash-master run package:installer

Write-Host "Building Touch Kiosk..."
pnpm --filter clickflash-touch run build:electron

Write-Host "Building License Generator..."
pnpm --filter clickflash-license-generator run package:win

Write-Host "Building MoneyTrash..."
pnpm --filter moneytrash-uploader run tauri:build

Write-Host "All packaging steps completed successfully!"
