# Touch App Deployment Script for Windows
# This script builds and deploys the Touch Kiosk application

param(
    [Parameter(Mandatory = $false)]
    [string]$DeployTarget = "local",
    
    [Parameter(Mandatory = $false)]
    [string]$RemoteHost = "",
    
    [Parameter(Mandatory = $false)]
    [string]$RemotePath = "/var/www/html/touch"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Touch App Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean previous builds
Write-Host "[1/5] Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "dist/touch") {
    Remove-Item -Recurse -Force "dist/touch"
    Write-Host "✓ Cleaned dist/touch directory" -ForegroundColor Green
}

# Step 2: Run TypeScript check
Write-Host ""
Write-Host "[2/5] Running TypeScript check..." -ForegroundColor Yellow
$tscResult = npx tsc --noEmit 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ TypeScript errors found!" -ForegroundColor Red
    Write-Host $tscResult
    exit 1
}
Write-Host "✓ TypeScript check passed" -ForegroundColor Green

# Step 3: Build production bundle
Write-Host ""
Write-Host "[3/5] Building production bundle..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Production build complete" -ForegroundColor Green

# Step 4: Create deployment package
Write-Host ""
Write-Host "[4/5] Creating deployment package..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "touch-app-$timestamp.zip"

if (Test-Path $packageName) {
    Remove-Item $packageName
}

Compress-Archive -Path "dist/touch/*" -DestinationPath $packageName
Write-Host "✓ Created package: $packageName" -ForegroundColor Green

# Step 5: Deploy based on target
Write-Host ""
Write-Host "[5/5] Deploying to $DeployTarget..." -ForegroundColor Yellow

if ($DeployTarget -eq "local") {
    Write-Host "Local deployment - files are in dist/touch/" -ForegroundColor Cyan
    Write-Host "You can serve them with: npm run preview" -ForegroundColor Cyan
}
elseif ($DeployTarget -eq "remote") {
    if ([string]::IsNullOrEmpty($RemoteHost)) {
        Write-Host "✗ Remote host not specified! Use -RemoteHost parameter" -ForegroundColor Red
        exit 1
    }
    Write-Host "Deploying to $RemoteHost`:$RemotePath..." -ForegroundColor Cyan
    scp -r dist/touch/* "${RemoteHost}:${RemotePath}/"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Deployed to remote server" -ForegroundColor Green
    }
    else {
        Write-Host "✗ Remote deployment failed!" -ForegroundColor Red
        exit 1
    }
}
elseif ($DeployTarget -eq "iis") {
    $iisPath = "C:\inetpub\wwwroot\touch"
    if (!(Test-Path $iisPath)) {
        New-Item -ItemType Directory -Path $iisPath -Force
    }
    Copy-Item -Path "dist/touch/*" -Destination $iisPath -Recurse -Force
    Write-Host "✓ Deployed to IIS: $iisPath" -ForegroundColor Green
}
else {
    Write-Host "✗ Unknown deployment target: $DeployTarget" -ForegroundColor Red
    Write-Host "Valid targets: local, remote, iis" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete! 🚀" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Package: $packageName" -ForegroundColor White
Write-Host "Build size: $('{0:N2}' -f ((Get-ChildItem -Path 'dist/touch' -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB)) MB" -ForegroundColor White
