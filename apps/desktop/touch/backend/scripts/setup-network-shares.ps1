# Touch Integration - Network Share Setup
# Run this script as Administrator to share Touch folders on the network

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Touch Integration - Network Share Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[ERROR] This script must be run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Right-click PowerShell and select 'Run as Administrator', then run this script again." -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

# Folder paths
$uploadFolder = "C:\TouchData\uploads"
$ordersFolder = "C:\TouchData\orders"

# Verify folders exist
Write-Host "Verifying folders..." -ForegroundColor Yellow
if (-not (Test-Path $uploadFolder)) {
    Write-Host "[ERROR] Upload folder not found: $uploadFolder" -ForegroundColor Red
    Write-Host "Please run 'node setup-touch-integration.js' first." -ForegroundColor Yellow
    pause
    exit 1
}

if (-not (Test-Path $ordersFolder)) {
    Write-Host "[ERROR] Orders folder not found: $ordersFolder" -ForegroundColor Red
    Write-Host "Please run 'node setup-touch-integration.js' first." -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "[✓] Folders verified" -ForegroundColor Green
Write-Host ""

# Share Upload Folder
Write-Host "Sharing Upload Folder..." -ForegroundColor Yellow
try {
    # Remove existing share if it exists
    $existingShare = Get-SmbShare -Name "TouchUploads" -ErrorAction SilentlyContinue
    if ($existingShare) {
        Remove-SmbShare -Name "TouchUploads" -Force -ErrorAction SilentlyContinue
        Write-Host "  Removed existing share" -ForegroundColor Gray
    }
    
    # Create new share
    New-SmbShare -Name "TouchUploads" -Path $uploadFolder -FullAccess "Everyone" -ErrorAction Stop | Out-Null
    Write-Host "[✓] Upload folder shared as: \\$env:COMPUTERNAME\TouchUploads" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to share upload folder: $_" -ForegroundColor Red
}

Write-Host ""

# Share Orders Folder
Write-Host "Sharing Orders Folder..." -ForegroundColor Yellow
try {
    # Remove existing share if it exists
    $existingShare = Get-SmbShare -Name "TouchOrders" -ErrorAction SilentlyContinue
    if ($existingShare) {
        Remove-SmbShare -Name "TouchOrders" -Force -ErrorAction SilentlyContinue
        Write-Host "  Removed existing share" -ForegroundColor Gray
    }
    
    # Create new share
    New-SmbShare -Name "TouchOrders" -Path $ordersFolder -ReadAccess "Everyone" -ErrorAction Stop | Out-Null
    Write-Host "[✓] Orders folder shared as: \\$env:COMPUTERNAME\TouchOrders" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to share orders folder: $_" -ForegroundColor Red
}

Write-Host ""

# Display share information
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Share Information" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$shares = Get-SmbShare -Name "TouchUploads", "TouchOrders" -ErrorAction SilentlyContinue
if ($shares) {
    $shares | Format-Table Name, Path, Description -AutoSize
} else {
    Write-Host "[WARNING] No shares found" -ForegroundColor Yellow
}

# Get network IP addresses
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Network Access Paths" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$networkIPs = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -ne "127.0.0.1" }

Write-Host "Access these shares from Master PC using:" -ForegroundColor Yellow
Write-Host ""

foreach ($ip in $networkIPs) {
    Write-Host "  Computer Name:" -ForegroundColor Cyan
    Write-Host "    \\$env:COMPUTERNAME\TouchUploads" -ForegroundColor White
    Write-Host "    \\$env:COMPUTERNAME\TouchOrders" -ForegroundColor White
    Write-Host ""
    Write-Host "  IP Address ($($ip.IPAddress)):" -ForegroundColor Cyan
    Write-Host "    \\$($ip.IPAddress)\TouchUploads" -ForegroundColor White
    Write-Host "    \\$($ip.IPAddress)\TouchOrders" -ForegroundColor White
    Write-Host ""
}

# Test instructions
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing from Master PC" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run these commands from the Master PC to test access:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  dir \\$env:COMPUTERNAME\TouchUploads" -ForegroundColor White
Write-Host "  dir \\$env:COMPUTERNAME\TouchOrders" -ForegroundColor White
Write-Host ""

# Firewall check
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Firewall Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$fileAndPrinterSharing = Get-NetFirewallRule -DisplayGroup "File and Printer Sharing" -Enabled True -ErrorAction SilentlyContinue
if ($fileAndPrinterSharing) {
    Write-Host "[✓] File and Printer Sharing is enabled in firewall" -ForegroundColor Green
} else {
    Write-Host "[WARNING] File and Printer Sharing may be blocked by firewall" -ForegroundColor Yellow
    Write-Host "  You may need to enable it manually in Windows Firewall settings" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next step: Restart the Touch server to activate the album monitor" -ForegroundColor Yellow
Write-Host ""

pause
