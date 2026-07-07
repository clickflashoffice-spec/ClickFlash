# ClickFlash Master Execution Script (PowerShell)
# Run from repo root: .\master_execution_script.ps1

$ErrorActionPreference = 'Stop'
$REPO_ROOT = $PSScriptRoot
Set-Location $REPO_ROOT

Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'CLICKFLASH MASTER EXECUTION SCRIPT' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan

# 1. Pre-commit hook
Write-Host '[1/7] Installing pre-commit hook...' -ForegroundColor Yellow
if (Test-Path docs/audit/tools/generated_pre-commit-hook.sh) {
  Copy-Item docs/audit/tools/generated_pre-commit-hook.sh .git/hooks/pre-commit -Force
  Write-Host '✅ Pre-commit hook installed' -ForegroundColor Green
}

# 2. Remove .env from tracking
Write-Host '[2/7] Removing .env files from git tracking...' -ForegroundColor Yellow
git rm -r --cached .env 2>$null; git rm -r --cached apps/*/.env 2>$null; git rm -r --cached apps/*/*/.env 2>$null
Add-Content .gitignore '`n.env`n*.env`n!.env.example'
git add .gitignore
git commit -m 'security: remove .env files from tracking' 2>$null || Write-Host 'Nothing to commit'
Write-Host '✅ .env files removed from tracking' -ForegroundColor Green

# 3. Install dependencies
Write-Host '[3/7] Running pnpm install...' -ForegroundColor Yellow
pnpm install
Write-Host '✅ Dependencies installed' -ForegroundColor Green

# 4. Audit
Write-Host '[3/7] Running pnpm audit...' -ForegroundColor Yellow
pnpm audit --prod --audit-level high 2>$null || Write-Host '⚠️ Audit found issues' -ForegroundColor Red

# 5. Typecheck
Write-Host '[4/7] Running typecheck...' -ForegroundColor Yellow
$apps = @('master','touch','gallery','management','moneytrash','website','installer')
foreach ($app in $apps) {
  if (Test-Path "apps/$app/package.json") {
    Write-Host "  Typechecking $app..."
    pnpm --filter $app typecheck 2>$null || Write-Host "    ⚠️ $app typecheck failed" -ForegroundColor Red
  }
}

# 6. Build
Write-Host '[5/7] Building all apps...' -ForegroundColor Yellow
foreach ($app in $apps) {
  if (Test-Path "apps/$app/package.json") {
    Write-Host "  Building $app..."
    pnpm --filter $app build 2>$null || Write-Host "    ⚠️ $app build failed" -ForegroundColor Red
  }
}

# 7. Tests
Write-Host '[6/7] Running tests...' -ForegroundColor Yellow
pnpm -r run test:ci 2>$null || pnpm -r run test 2>$null || Write-Host '⚠️ Tests failed' -ForegroundColor Red

Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'SCRIPT COMPLETE' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'Review manual steps in WS01-WS04 checklists.' -ForegroundColor Yellow