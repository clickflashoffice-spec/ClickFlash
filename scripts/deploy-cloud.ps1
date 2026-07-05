# ClickFlash Cloud Deployment Orchestrator
# Automates the sequential build and deployment of the ClickFlash Cloud Ecosystem

$ErrorActionPreference = "Stop"
$StartTime = Get-Date

Write-Host "Starting ClickFlash Cloud Zero-Touch Deployment" -ForegroundColor Cyan

# 0. Pre-flight: Apply D1 migrations
Write-Host "`n[0/4] Applying D1 migrations..." -ForegroundColor Yellow

Write-Host "  Gallery DB migrations..." -ForegroundColor Gray
if (Test-Path "apps/gallery/backend/migrations") {
    npx wrangler d1 migrations apply gallery-db --config apps/gallery/backend/wrangler.toml
    if ($LASTEXITCODE -ne 0) { throw "Gallery D1 migration failed" }
} else {
    Write-Host "  No migrations found for Gallery DB, skipping..." -ForegroundColor Gray
}

Write-Host "  Management DB migrations..." -ForegroundColor Gray
if (Test-Path "apps/management/backend/migrations") {
    npx wrangler d1 migrations apply management-db --config apps/management/backend/wrangler.toml
    if ($LASTEXITCODE -ne 0) { throw "Management D1 migration failed" }
} else {
    Write-Host "  No migrations found for Management DB, skipping..." -ForegroundColor Gray
}

Write-Host "  D1 migrations applied successfully" -ForegroundColor Green

# 1. Website (Next.js Pages)
# Handled via GitHub integration to avoid Windows Next-on-Pages limitations.
Write-Host "`n[1/4] Skipping Main Website (Deployed via GitHub Integration)..." -ForegroundColor Yellow
# Push-Location apps/website
# npm run build
# npx wrangler pages deploy .vercel/output/static --project-name clickflash-website
# Pop-Location

# 2. Management Hub (Worker + Pages)
Write-Host "`n[2/4] Deploying Management Hub..." -ForegroundColor Yellow
# Backend
Push-Location apps/management/backend
npx wrangler deploy
Pop-Location
# Frontend
Push-Location apps/management
npm run build
if ($LASTEXITCODE -ne 0) { throw "Management Hub frontend build failed" }
npx wrangler pages deploy dist --project-name management-hub
Pop-Location

# 3. Customer Gallery (Worker + Pages)
Write-Host "`n[3/4] Deploying Customer Gallery..." -ForegroundColor Yellow
# Backend
Push-Location apps/gallery/backend
npx wrangler deploy
Pop-Location
# Frontend
Push-Location apps/gallery
npm run build
if ($LASTEXITCODE -ne 0) { throw "Customer Gallery frontend build failed" }
npx wrangler pages deploy dist --project-name customer-gallery
Pop-Location

# 4. Post-deploy verification
Write-Host "`n[4/4] Verifying deployments..." -ForegroundColor Yellow

$verifyUrls = @{
  "Gallery API"    = "https://gallery-backend.clickflash-office.workers.dev/api/health"
  "Management API" = "https://management-hub.clickflash-office.workers.dev/api/health"
}

foreach ($name in $verifyUrls.Keys) {
  try {
    $response = Invoke-WebRequest -Uri $verifyUrls[$name] -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
      Write-Host "  [OK] $name" -ForegroundColor Green
    } else {
      Write-Host "  [WARN] $name returned $($response.StatusCode)" -ForegroundColor Yellow
    }
  } catch {
    Write-Host "  [FAIL] $name unreachable" -ForegroundColor Red
  }
}

$Duration = (Get-Date) - $StartTime
Write-Host "`nDeployment Complete! Total Time: $($Duration.TotalSeconds)s" -ForegroundColor Green
Write-Host "Run './scripts/provision-secrets.sh --check' to verify secrets." -ForegroundColor Gray
