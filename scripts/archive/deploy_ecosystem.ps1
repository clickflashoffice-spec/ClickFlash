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

Write-Step "Installing workspace dependencies..."
npm install --legacy-peer-deps

# 2. Build Backends (Management, Gallery)
Write-Step "Building Management Backend..."
$originalDir = Get-Location
try {
    Set-Location "apps/management/backend"
    # Backend doesn't strictly need a 'build' step if using tsx/node, but we ensure deps are up
} finally {
    Set-Location $originalDir
}

Write-Step "Building Gallery Backend..."
try {
    Set-Location "apps/gallery/backend"
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
        Write-Host "Skipping individual dependency installation to use workspace dependencies..." -ForegroundColor Yellow
        
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
Write-Host "`n[BUILD] Sanitizing apps/website for frontend build..." -ForegroundColor Cyan
$originalDir = Get-Location
try {
    Set-Location "apps/website"
    Write-Host "Running: wsl npx @cloudflare/next-on-pages" -ForegroundColor Green
    wsl npx @cloudflare/next-on-pages
    $res = $LASTEXITCODE
} finally {
    Set-Location $originalDir
}
if ($res -ne 0) { throw "Build failed for apps/website" }

# Gallery
Build-Frontend "apps/gallery"

# Management Portal
Build-Frontend "apps/management"

# 5. Merge and Deploy
Write-Step "Merging and Deploying Unified Project..."

$websiteSource = "apps/website/.vercel/output/static"
if (-not (Test-Path $websiteSource)) { throw "Website output not found at $websiteSource. Did next-on-pages fail?" }

# Copy Gallery 'dist' to '.vercel/output/static/gallery'
$galleryDest = "$websiteSource/gallery"
if (Test-Path $galleryDest) { Remove-Item -Recurse -Force $galleryDest }
New-Item -ItemType Directory -Force -Path $galleryDest | Out-Null
Copy-Item -Recurse -Force "apps/gallery/dist/*" $galleryDest

# Copy Management 'dist' to '.vercel/output/static/manage'
$manageDest = "$websiteSource/manage"
if (Test-Path $manageDest) { Remove-Item -Recurse -Force $manageDest }
New-Item -ItemType Directory -Force -Path $manageDest | Out-Null
Copy-Item -Recurse -Force "apps/management/dist/*" $manageDest

Write-Host "Deploying Unified Site to Cloudflare Pages..."
$originalDir = Get-Location
try {
    Set-Location "apps/website"
    npx wrangler pages deploy .vercel/output/static --project-name clickflash-website --commit-dirty=true
} finally {
    Set-Location $originalDir
}


Write-Step "Deployment Complete!"
Write-Host "Your Unified ClickFlash Site is live." -ForegroundColor Green
Write-Host "Main Site: https://www.clicketflash.com"
Write-Host "Gallery: https://www.clicketflash.com/gallery"
Write-Host "Management: https://www.clicketflash.com/manage/?mode=management"
