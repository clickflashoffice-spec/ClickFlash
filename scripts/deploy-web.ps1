# ClickFlash STICKY-CLEAN Unified Build & Deployment Script

$ErrorActionPreference = "Stop"

Write-Host "--- PHASE 0: DEEP CLEAN ---" -ForegroundColor Yellow
Remove-Item -Path "e:\ClickFlash\apps\website\out" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "e:\ClickFlash\apps\website\.next" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "e:\ClickFlash\apps\website\public\manage\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "e:\ClickFlash\apps\website\public\gallery\*" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "--- PHASE 1: BUILD MANAGEMENT HUB ---" -ForegroundColor Cyan
Set-Location "e:\ClickFlash\apps\management"
npm run build
New-Item -ItemType Directory -Force -Path "e:\ClickFlash\apps\website\public\manage"
Copy-Item -Path "dist\*" -Destination "e:\ClickFlash\apps\website\public\manage\" -Recurse -Force

Write-Host "--- PHASE 2: BUILD CUSTOMER GALLERY ---" -ForegroundColor Cyan
Set-Location "e:\ClickFlash\apps\gallery"
npm run build
New-Item -ItemType Directory -Force -Path "e:\ClickFlash\apps\website\public\gallery"
Copy-Item -Path "dist\*" -Destination "e:\ClickFlash\apps\website\public\gallery\" -Recurse -Force

Write-Host "--- PHASE 3: BUILD REDESIGNED WEBSITE ---" -ForegroundColor Cyan
Set-Location "e:\ClickFlash\apps\website"
npm run build

Write-Host "--- PHASE 4: CLOUDFLARE DEPLOYMENT ---" -ForegroundColor Cyan
npx wrangler pages deploy out --project-name=clickflash-website --commit-dirty=true

Write-Host "--- SUCCESS: REBUILT FROM ZERO ---" -ForegroundColor Green
