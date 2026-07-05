<#
.SYNOPSIS
Unified Bootstrap script for ClickFlash Ecosystem (Master & Touch) installation.

.DESCRIPTION
Configures Windows Firewall, Power Plans, and Auto-start registry keys to ensure
the ClickFlash ecosystem runs smoothly as a zero-touch kiosk.
#>

$ErrorActionPreference = "Continue"

Write-Host "Configuring ClickFlash Ecosystem for Windows..."

# 1. Firewall Configuration
Write-Host "Configuring firewall for Master Portal (TCP 8090)..."
New-NetFirewallRule -DisplayName "ClickFlash Master App" -Direction Inbound -LocalPort 8090 -Protocol TCP -Action Allow -Profile Any -Description "Allows inbound connections for the ClickFlash Master Portal" -Force

Write-Host "Configuring firewall for Touch App (TCP 8091)..."
New-NetFirewallRule -DisplayName "ClickFlash Touch App" -Direction Inbound -LocalPort 8091 -Protocol TCP -Action Allow -Profile Any -Description "Allows inbound connections for the ClickFlash Touch Kiosk" -Force

Write-Host "Configuring firewall for mDNS Discovery (UDP 5353)..."
New-NetFirewallRule -DisplayName "ClickFlash mDNS Discovery" -Direction Inbound -LocalPort 5353 -Protocol UDP -Action Allow -Profile Any -Description "Allows inbound connections for ClickFlash local network discovery" -Force

# 2. Power Plan Configuration (High Performance to prevent sleep)
Write-Host "Setting power plan to High Performance..."
try {
    # High Performance GUID
    powercfg -setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c
    powercfg -change -monitor-timeout-ac 0
    powercfg -change -disk-timeout-ac 0
    powercfg -change -standby-timeout-ac 0
    Write-Host "Power plan configured successfully."
} catch {
    Write-Warning "Could not configure power plan: $_"
}

# 3. Auto-Start Configuration
Write-Host "Configuring Auto-Start via Registry..."
$registryPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$masterPath = "$env:LOCALAPPDATA\Programs\clickflash-master\ClickFlash Master OS.exe"
$touchPath = "$env:LOCALAPPDATA\Programs\clickflash-touch\ClickFlash Touch.exe"

try {
    if (Test-Path $masterPath) {
        Set-ItemProperty -Path $registryPath -Name "ClickFlash Master" -Value "`"$masterPath`" --hidden"
        Write-Host "Added Master App to startup."
    } else {
        Write-Warning "Master App executable not found at $masterPath. Skipping startup entry."
    }

    if (Test-Path $touchPath) {
        Set-ItemProperty -Path $registryPath -Name "ClickFlash Touch" -Value "`"$touchPath`""
        Write-Host "Added Touch App to startup."
    } else {
        Write-Warning "Touch App executable not found at $touchPath. Skipping startup entry."
    }
} catch {
    Write-Warning "Failed to set auto-start registry keys: $_"
}

Write-Host "Windows Kiosk configuration complete."
exit 0
