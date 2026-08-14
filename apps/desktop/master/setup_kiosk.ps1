# ClickFlash - Master Station Kiosk Configuration
# Supports Electron Shell Replacement and Chrome Web Kiosk modes.
# Usage: setup_kiosk.ps1 [enable-electron|enable-web|disable]

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ElectronAppPath = Join-Path $ScriptDir "release\win-unpacked\ClickFlash Master.exe"
$WebStartupScript = Join-Path $ScriptDir "AUTO_START_WEB_KIOSK.bat"
$StartupFolder = [Environment]::GetFolderPath('Startup')

function Set-ElectronKioskShell {
    Write-Host ""
    Write-Host "[Electron Kiosk Mode]" -ForegroundColor Cyan
    
    if (-not (Test-Path $ElectronAppPath)) {
        Write-Host "[ERROR] Electron app not found at:" -ForegroundColor Red
        Write-Host "  $ElectronAppPath" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Build the Electron package first:" -ForegroundColor Yellow
        Write-Host "  Run 5_PACKAGE.bat or: npm run build:electron" -ForegroundColor Gray
        return
    }
    
    # Replace Windows Shell with Electron app
    $RegPath = "HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Winlogon"
    if (-not (Test-Path $RegPath)) { New-Item -Path $RegPath -Force | Out-Null }
    Set-ItemProperty -Path $RegPath -Name "Shell" -Value $ElectronAppPath
    
    Write-Host "[OK] Windows Shell replaced with ClickFlash Master." -ForegroundColor Green
    Write-Host "  Path: $ElectronAppPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[WARNING] Restart required. To revert, run:" -ForegroundColor Yellow
    Write-Host "  setup_kiosk.ps1 disable" -ForegroundColor Gray
}

function Set-WebKioskStartup {
    Write-Host ""
    Write-Host "[Web Kiosk Mode (Chrome)]" -ForegroundColor Cyan
    
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
    
    # Create the auto-start batch script
    $WebKioskContent = @"
@echo off
title ClickFlash Master - Kiosk Mode
cd /d "$ScriptDir"

echo [ClickFlash] Starting Master backend...
start /min cmd /c "npm start"

echo [ClickFlash] Waiting for server startup...
timeout /t 8 /nobreak >nul

echo [ClickFlash] Launching Chrome kiosk...
start "" "$ChromePath" --kiosk --app=http://localhost:8090 --no-first-run --disable-session-crashed-bubble --disable-infobars --overscroll-history-navigation=0 --disable-pinch --disable-features=TranslateUI --disable-component-update --disable-background-networking --disable-sync --disable-translate --disable-extensions --noerrdialogs --disable-suggestions-service --disable-save-password-bubble --disable-default-apps --no-default-browser-check
"@
    
    Set-Content -Path $WebStartupScript -Value $WebKioskContent -Force
    
    # Create shortcut in Windows Startup folder
    $WshShell = New-Object -ComObject WScript.Shell
    $ShortcutPath = Join-Path $StartupFolder "ClickFlash Master Kiosk.lnk"
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = $WebStartupScript
    $Shortcut.WorkingDirectory = $ScriptDir
    $Shortcut.Save()
    
    Write-Host "[OK] Web Kiosk startup configured." -ForegroundColor Green
    Write-Host "  Script:   $WebStartupScript" -ForegroundColor Gray
    Write-Host "  Shortcut: $ShortcutPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[Security Hardening] For maximum lockdown:" -ForegroundColor Yellow
    Write-Host "  1. Create a dedicated 'kiosk' Windows user account" -ForegroundColor Gray
    Write-Host "  2. Disable Task Manager: gpedit.msc > User Config > Admin Templates > System > Ctrl+Alt+Del" -ForegroundColor Gray
    Write-Host "  3. Auto-hide taskbar: Right-click taskbar > Settings > Auto-hide" -ForegroundColor Gray
    Write-Host "  4. Disable Ctrl+Alt+Del: Registry HKCU\...\Policies\System > DisableTaskMgr = 1" -ForegroundColor Gray
}

function Restore-NormalMode {
    Write-Host ""
    Write-Host "[Restoring Normal Mode]" -ForegroundColor Cyan
    
    # Remove Electron shell replacement
    $RegPath = "HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Winlogon"
    Remove-ItemProperty -Path $RegPath -Name "Shell" -ErrorAction SilentlyContinue
    Write-Host "  Removed Electron shell override." -ForegroundColor Green
    
    # Remove web kiosk startup shortcut
    $ShortcutPath = Join-Path $StartupFolder "ClickFlash Master Kiosk.lnk"
    if (Test-Path $ShortcutPath) {
        Remove-Item $ShortcutPath -Force
        Write-Host "  Removed startup shortcut." -ForegroundColor Green
    }
    
    # Remove web kiosk auto-start script
    if (Test-Path $WebStartupScript) {
        Remove-Item $WebStartupScript -Force
        Write-Host "  Removed auto-start script." -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "[OK] Normal Windows mode restored." -ForegroundColor Green
    Write-Host "  Restart to take effect." -ForegroundColor Gray
}

# ---- Entry Point ----
$Action = $args[0]
switch ($Action) {
    "enable-electron" { Set-ElectronKioskShell }
    "enable-web"      { Set-WebKioskStartup }
    "disable"         { Restore-NormalMode }
    default {
        Write-Host ""
        Write-Host "ClickFlash Kiosk Setup" -ForegroundColor Cyan
        Write-Host "Usage: setup_kiosk.ps1 [enable-electron|enable-web|disable]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  enable-electron  Replace Windows Shell with Electron app" -ForegroundColor Gray
        Write-Host "  enable-web       Auto-start Chrome in kiosk mode on login" -ForegroundColor Gray
        Write-Host "  disable          Restore normal Windows desktop" -ForegroundColor Gray
    }
}
