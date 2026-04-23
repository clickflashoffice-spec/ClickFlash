# ClickFlash Cloud Deployment Orchestrator
# Automates the sequential build and deployment of the ClickFlash Cloud Ecosystem

$ErrorActionPreference = "Stop"
$StartTime = Get-Date

Write-Host "🚀 Starting ClickFlash Cloud Zero-Touch Deployment" -ForegroundColor Cyan

# 1. Website (Next.js Pages)
Write-Host "`n🌐 [1/3] Deploying Main Website..." -ForegroundColor Yellow
Push-Location apps/website
npm run build
if ($LASTEXITCODE -ne 0) { throw "Website build failed" }
npx wrangler pages deploy out --project-name clickflash-website
Pop-Location

# 2. Management Hub (Worker + Pages)
Write-Host "`n📊 [2/3] Deploying Management Hub..." -ForegroundColor Yellow
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
Write-Host "`n🛍️ [3/3] Deploying Customer Gallery..." -ForegroundColor Yellow
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

$Duration = (Get-Date) - $StartTime
Write-Host "`n✅ Deployment Complete! Total Time: $($Duration.TotalSeconds)s" -ForegroundColor Green
Write-Host "Check Cloudflare Dashboard for final verification." -ForegroundColor Gray
