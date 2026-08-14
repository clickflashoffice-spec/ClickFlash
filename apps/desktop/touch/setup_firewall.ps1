# ClickFlash - Touch Kiosk Firewall Setup
# Run as Administrator. Opens ports for Touch and Master communication.

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  ClickFlash - Touch Firewall Configuration" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

function Add-FirewallRule {
    param (
        [string]$Name,
        [int]$Port,
        [string]$Protocol = "TCP",
        [string]$Direction = "Inbound"
    )
    
    Write-Host "  Configuring: $Name (Port $Port/$Protocol $Direction)..." -ForegroundColor Gray
    
    $existing = Get-NetFirewallRule -DisplayName $Name -ErrorAction SilentlyContinue
    if ($existing) {
        Set-NetFirewallRule -DisplayName $Name -LocalPort $Port -Protocol $Protocol -Action Allow -Enabled True | Out-Null
        Write-Host "    Updated existing rule." -ForegroundColor Yellow
    }
    else {
        New-NetFirewallRule -DisplayName $Name -Direction $Direction -LocalPort $Port -Protocol $Protocol -Action Allow -Enabled True -Profile Private, Domain | Out-Null
        Write-Host "    Rule created." -ForegroundColor Green
    }
}

# ---- Touch App Port (Inbound) ----
Write-Host "[Touch Kiosk - Inbound]" -ForegroundColor Cyan
Add-FirewallRule -Name "ClickFlash - Touch HTTP (8091)" -Port 8091 -Protocol "TCP"
Add-FirewallRule -Name "ClickFlash - Touch WS (8091)" -Port 8091 -Protocol "UDP"

# ---- Master App Port (Outbound connection needed) ----
Write-Host ""
Write-Host "[Master Station - Outbound]" -ForegroundColor Cyan
Add-FirewallRule -Name "ClickFlash - Master HTTP (8090)" -Port 8090 -Protocol "TCP"

# ---- mDNS / Bonjour Discovery ----
Write-Host ""
Write-Host "[Service Discovery]" -ForegroundColor Cyan
Add-FirewallRule -Name "ClickFlash - mDNS Discovery (5353)" -Port 5353 -Protocol "UDP"

# ---- Vite Dev Server (Development Only) ----
Write-Host ""
Write-Host "[Development Ports]" -ForegroundColor Cyan
Add-FirewallRule -Name "ClickFlash - Vite Touch Dev (5174)" -Port 5174 -Protocol "TCP"

# ---- Network Profile Check ----
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Touch Firewall Setup Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$profiles = Get-NetConnectionProfile | Where-Object { $_.NetworkCategory -eq "Public" }
if ($profiles) {
    Write-Host "[WARNING] Network is set to 'Public'." -ForegroundColor Yellow
    Write-Host "  LAN discovery will not work. Switch to 'Private':" -ForegroundColor Yellow
    Write-Host "  Settings > Network > Properties > Network profile type > Private" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "Ports opened:" -ForegroundColor Gray
Write-Host "  8091  TCP/UDP  Touch Kiosk (Inbound)" -ForegroundColor Gray
Write-Host "  8090  TCP      Master Station (Outbound)" -ForegroundColor Gray
Write-Host "  5353  UDP      mDNS Discovery" -ForegroundColor Gray
Write-Host "  5174  TCP      Vite Dev (Touch)" -ForegroundColor Gray
Write-Host ""

if ($Host.Name -eq "ConsoleHost") {
    Write-Host "Press any key to exit..."
    $void = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
