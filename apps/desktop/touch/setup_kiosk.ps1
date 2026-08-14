# ClickFlash - Touch Kiosk Configuration
# Sets up auto-start in locked Chrome kiosk mode for customer-facing displays.
# Usage: setup_kiosk.ps1 [enable-web|enable-electron|disable]

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ElectronAppPath = Join-Path $ScriptDir "release\win-unpacked\ClickFlash Touch.exe"
$WebStartupScript = Join-Path $ScriptDir "AUTO_START_TOUCH_KIOSK.bat"
$StartupFolder = [Environment]::GetFolderPath('Startup')

function Set-ElectronKioskShell {
    Write-Host ""
    Write-Host "[Touch Electron Kiosk Mode]" -ForegroundColor Cyan
    
    if (-not (Test-Path $ElectronAppPath)) {
        Write-Host "[ERROR] Electron app not found at:" -ForegroundColor Red
        Write-Host "  $ElectronAppPath" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Build the Electron package first:" -ForegroundColor Yellow
        Write-Host "  Run 5_PACKAGE.bat or: npm run build:electron" -ForegroundColor Gray
        return
    }
    
    $RegPath = "HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Winlogon"
    if (-not (Test-Path $RegPath)) { New-Item -Path $RegPath -Force | Out-Null }
    Set-ItemProperty -Path $RegPath -Name "Shell" -Value $ElectronAppPath
    
    Write-Host "[OK] Windows Shell replaced with ClickFlash Touch." -ForegroundColor Green
    Write-Host "  Path: $ElectronAppPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[WARNING] Restart required. To revert: setup_kiosk.ps1 disable" -ForegroundColor Yellow
}

function Set-WebKioskStartup {
    Write-Host ""
    Write-Host "[Touch Web Kiosk Mode (Chrome)]" -ForegroundColor Cyan
    
    # Detect Chrome path
    $ChromePaths = @(
        "C:\Program Files\Google\Chrome\Application\chrome.exe",
        "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe"
    )
    $ChromePath = $ChromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
    
    if (-not $ChromePath) {
        Write-Host "[ERROR] Google Chrome not found." -ForegroundColor Red
        Write-Host "  Install Chrome or use Electron mode instead." -ForegroundColor Yellow
        return
    }
    
    # Touch Kiosk: starts backend, then opens Chrome in kiosk to Touch UI
    $WebKioskContent = @"
@echo off
title ClickFlash Touch - Kiosk Mode
cd /d "$ScriptDir"

echo [ClickFlash Touch] Starting backend server...
start /min cmd /c "npm start"

echo [ClickFlash Touch] Waiting for server startup...
timeout /t 8 /nobreak >nul

echo [ClickFlash Touch] Launching Touch kiosk...
start "" "$ChromePath" --kiosk --app=http://localhost:8091 --no-first-run --disable-session-crashed-bubble --disable-infobars --overscroll-history-navigation=0 --disable-pinch --disable-features=TranslateUI --disable-component-update --disable-background-networking --disable-sync --disable-translate --disable-extensions --noerrdialogs --disable-suggestions-service --disable-save-password-bubble --disable-default-apps --no-default-browser-check --disable-popup-blocking
"@
    
    Set-Content -Path $WebStartupScript -Value $WebKioskContent -Force
    
    # Create shortcut in Windows Startup folder
    $WshShell = New-Object -ComObject WScript.Shell
    $ShortcutPath = Join-Path $StartupFolder "ClickFlash Touch Kiosk.lnk"
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = $WebStartupScript
    $Shortcut.WorkingDirectory = $ScriptDir
    $Shortcut.Save()
    
    Write-Host "[OK] Touch Kiosk startup configured." -ForegroundColor Green
    Write-Host "  Script:   $WebStartupScript" -ForegroundColor Gray
    Write-Host "  Shortcut: $ShortcutPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[Security] Touch Kiosk hardening:" -ForegroundColor Yellow
    Write-Host "  1. Use a dedicated 'kiosk' Windows user account (no admin)" -ForegroundColor Gray
    Write-Host "  2. Disable Task Manager via Group Policy" -ForegroundColor Gray
    Write-Host "  3. Auto-hide the Windows taskbar" -ForegroundColor Gray
    Write-Host "  4. Disable USB storage via Group Policy (optional)" -ForegroundColor Gray
    Write-Host "  5. Connect to Master via Ethernet ONLY (no WiFi)" -ForegroundColor Gray
}

function Restore-NormalMode {
    Write-Host ""
    Write-Host "[Restoring Normal Mode]" -ForegroundColor Cyan
    
    $RegPath = "HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Winlogon"
    Remove-ItemProperty -Path $RegPath -Name "Shell" -ErrorAction SilentlyContinue
    Write-Host "  Removed Electron shell override." -ForegroundColor Green
    
    $ShortcutPath = Join-Path $StartupFolder "ClickFlash Touch Kiosk.lnk"
    if (Test-Path $ShortcutPath) {
        Remove-Item $ShortcutPath -Force
        Write-Host "  Removed startup shortcut." -ForegroundColor Green
    }
    
    if (Test-Path $WebStartupScript) {
        Remove-Item $WebStartupScript -Force
        Write-Host "  Removed auto-start script." -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "[OK] Normal Windows mode restored." -ForegroundColor Green
}

# ---- Entry Point ----
$Action = $args[0]
switch ($Action) {
    "enable-electron" { Set-ElectronKioskShell }
    "enable-web" { Set-WebKioskStartup }
    "disable" { Restore-NormalMode }
    default {
        Write-Host ""
        Write-Host "ClickFlash Touch Kiosk Setup" -ForegroundColor Cyan
        Write-Host "Usage: setup_kiosk.ps1 [enable-web|enable-electron|disable]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  enable-web       Auto-start Chrome kiosk on login (recommended)" -ForegroundColor Gray
        Write-Host "  enable-electron   Replace Windows Shell with Electron" -ForegroundColor Gray
        Write-Host "  disable          Restore normal Windows desktop" -ForegroundColor Gray
    }
}
