#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Setup External Uploader Hotel for MoneyTrash
    
.DESCRIPTION
    Configures MoneyTrash as "External Uploader" hotel pre-registered to Cloudflare:
    - Copies configuration files
    - Registers with Management Hub
    - Sets up R2 upload folders
    - Verifies connectivity
    
.EXAMPLE
    .\setup-external-uploader.ps1
#>

$ErrorActionPreference = "Stop"

$HOTEL_ID = "EXT001"
$HOTEL_NAME = "External Uploader"

function Write-Header($text) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host $text -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
}

# Main Execution
Write-Header "Setting up $HOTEL_NAME"

Write-Host "Hotel ID: $HOTEL_ID" -ForegroundColor Yellow
Write-Host "Name: $HOTEL_NAME" -ForegroundColor Yellow
Write-Host ""

# Step 1: Copy configuration
Write-Host "Step 1: Copying configuration..." -ForegroundColor Yellow

$envFile = "..\.env.external-uploader"
$targetFile = "..\.env"

if (Test-Path $envFile) {
    Copy-Item $envFile $targetFile -Force
    Write-Host "✅ Configuration copied to .env" -ForegroundColor Green
} else {
    Write-Host "❌ Configuration file not found: $envFile" -ForegroundColor Red
    exit 1
}

# Step 2: Create data directory
Write-Host "`nStep 2: Creating data directories..." -ForegroundColor Yellow

$dirs = @("..\data", "..\logs", "..\uploads")
foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  Created: $dir" -ForegroundColor Gray
    }
}
Write-Host "✅ Directories created" -ForegroundColor Green

# Step 3: Generate unique credentials
Write-Host "`nStep 3: Generating credentials..." -ForegroundColor Yellow

$apiKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
$accessKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 16 | ForEach-Object { [char]$_ })
$secretKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })

# Update .env with generated credentials
$envContent = Get-Content $targetFile -Raw
$envContent = $envContent -replace "ext_uploader_api_key_\$\(date \+\%s\)", $apiKey
$envContent = $envContent -replace "ext_uploader_access_key", $accessKey
$envContent = $envContent -replace "ext_uploader_secret_key", $secretKey
$envContent | Set-Content $targetFile -NoNewline

Write-Host "✅ Credentials generated" -ForegroundColor Green
Write-Host "  API Key: $($apiKey.Substring(0, 10))..." -ForegroundColor Gray

# Step 4: Save credentials
Write-Host "`nStep 4: Saving credentials..." -ForegroundColor Yellow

$credentials = @{
    hotelId = $HOTEL_ID
    hotelName = $HOTEL_NAME
    apiKey = $apiKey
    accessKey = $accessKey
    secretKey = $secretKey
    createdAt = Get-Date -Format "o"
} | ConvertTo-Json

$credentials | Set-Content "..\external-uploader-credentials.json"
Write-Host "✅ Credentials saved to external-uploader-credentials.json" -ForegroundColor Green

# Step 5: Register with Hub (optional)
Write-Host "`nStep 5: Register with Management Hub?" -ForegroundColor Yellow
Write-Host "  This will register the hotel in the cloud system." -ForegroundColor Gray
$register = Read-Host "  Register now? (y/N)"

if ($register -eq 'y' -or $register -eq 'Y') {
    Write-Host "`n  Registering with Hub..." -ForegroundColor Yellow
    
    try {
        node register-external-uploader.js
        Write-Host "✅ Registration complete" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️  Registration failed (Hub may be unavailable)" -ForegroundColor Yellow
        Write-Host "  You can register later using:" -ForegroundColor Gray
        Write-Host "  node scripts/register-external-uploader.js" -ForegroundColor Gray
    }
}

# Summary
Write-Header "Setup Complete"

Write-Host "✅ $HOTEL_NAME is configured!" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Hotel ID: $HOTEL_ID" -ForegroundColor Gray
Write-Host "  Config: .env" -ForegroundColor Gray
Write-Host "  Credentials: external-uploader-credentials.json" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Install dependencies: npm install" -ForegroundColor Gray
Write-Host "  2. Start development: npm run dev" -ForegroundColor Gray
Write-Host "  3. Or build desktop: npm run tauri build" -ForegroundColor Gray
Write-Host ""
