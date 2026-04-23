# ClickFlash Ecosystem Deployment Script
# Automates the build and deployment of Gallery, Website, and Management Portal to Cloudflare

Write-Host "==============================================" -ForegroundColor Yellow
Write-Host "   CLICKFLASH ECOSYSTEM DEPLOYMENT SYSTEM   " -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Yellow

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n>>> $Message" -ForegroundColor Green -BackgroundColor Black
}

# 1. Environment Verification
Write-Step "Checking environment..."
if (-not (Test-Path ".env")) {
    throw ".env file missing in root. Required for secrets."
}

# 2. Build Backends (Management, Gallery)
Write-Step "Building Management Backend..."
$originalDir = Get-Location
try {
    Set-Location "apps/management/backend"
    npm install
    # Backend doesn't strictly need a 'build' step if using tsx/node, but we ensure deps are up
} finally {
    Set-Location $originalDir
}

Write-Step "Building Gallery Backend..."
try {
    Set-Location "apps/gallery/backend"
    npm install
} finally {
    Set-Location $originalDir
}

# 3. Optimized Frontend Build Logic
function Build-Frontend {
    param([string]$Path, [string]$BuildScript = "build")
    $originalDir = Get-Location
    Set-Location $Path
    
    Write-Host "`n[BUILD] Sanitizing $Path for frontend build..." -ForegroundColor Cyan
    
    try {
        if ($Path -ne "apps/website" -and $Path -ne "apps/management") {
            if (Test-Path "node_modules") { 
                Write-Host "Cleaning node_modules in $Path (Optimized CMD mode)..." -ForegroundColor Gray
                cmd /c "rmdir /s /q node_modules"
            }
            
            Write-Host "Installing dependencies with --ignore-scripts --legacy-peer-deps..." -ForegroundColor Gray
            npm install --ignore-scripts --legacy-peer-deps --quiet
        } else {
            Write-Host "Skipping dependency installation for $Path to preserve repaired node_modules..." -ForegroundColor Yellow
        }
        
        Write-Host "Running: npm run $BuildScript" -ForegroundColor Green
        npm run $BuildScript
        $res = $LASTEXITCODE
    } finally {
        Set-Location $originalDir
    }
    
    if ($res -ne 0) { throw "Build failed for $Path" }
}

# 4. Build Frontends Sequentially
Write-Step "Building Frontends (Sanitized Mode)..."

# Website
Build-Frontend "apps/website"

# Gallery
Build-Frontend "apps/gallery"

# Management Portal
Build-Frontend "apps/management"

# 5. Merge and Deploy
Write-Step "Merging and Deploying Unified Project..."

# Ensure 'out' directory exists
if (Test-Path "out") { Remove-Item -Recurse -Force "out" }
New-Item -ItemType Directory -Force -Path "out" | Out-Null

# Copy Website 'out' to Unified 'out'
$websiteSource = "apps/website/out"
if (-not (Test-Path $websiteSource)) { throw "Website output not found at $websiteSource." }
Write-Host "Copying Website Base to Unified Output..."
Copy-Item -Recurse -Force "$websiteSource/*" "out"

# Copy Gallery 'dist' to Unified 'out/gallery'
$galleryDest = "out/gallery"
if (Test-Path $galleryDest) { Remove-Item -Recurse -Force $galleryDest }
New-Item -ItemType Directory -Force -Path $galleryDest | Out-Null
Copy-Item -Recurse -Force "apps/gallery/dist/*" $galleryDest

# Copy Management 'dist' to Unified 'out/manage'
$manageDest = "out/manage"
if (Test-Path $manageDest) { Remove-Item -Recurse -Force $manageDest }
New-Item -ItemType Directory -Force -Path $manageDest | Out-Null
Copy-Item -Recurse -Force "apps/management/dist/*" $manageDest

# Copy Redirects
if (Test-Path "apps/website/public/_redirects") {
    Copy-Item -Force "apps/website/public/_redirects" "out/_redirects"
}

Write-Host "Deploying Unified Site to Cloudflare Pages..."
npx wrangler pages deploy out --project-name clickflash-website --commit-dirty=true

Write-Step "Deployment Complete!"
Write-Host "Your Unified ClickFlash Site is live." -ForegroundColor Green
Write-Host "Main Site: https://www.clicketflash.com"
Write-Host "Gallery: https://www.clicketflash.com/gallery"
Write-Host "Management: https://www.clicketflash.com/manage/?mode=management"
