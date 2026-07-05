# ClickFlash Local Disk Cleanup Script
# Removes regenerable files (node_modules, build artifacts, agent backups)
# Safe: all removed files are git-ignored and can be restored
# Run: Right-click > Run with PowerShell  OR  .\cleanup-local.ps1

$ErrorActionPreference = "SilentlyContinue"
$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ClickFlash Local Disk Cleanup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# --- Before size ---
$beforeSize = (Get-ChildItem -Path $root -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
Write-Host "Current folder size: $([math]::Round($beforeSize / 1GB, 2)) GB" -ForegroundColor Yellow

# === A1: Agent/tool backup directories ===
Write-Host "`n[A1] Removing agent/tool backup directories..." -ForegroundColor Green
$a1Dirs = @(".agent_backup_old", ".agent_HIDDEN", ".kilo", ".claire", "artifacts")
foreach ($d in $a1Dirs) {
    $path = Join-Path $root $d
    if (Test-Path $path) {
        Remove-Item -Path $path -Recurse -Force
        Write-Host "  Removed: $d" -ForegroundColor Gray
    }
}

# === A2: Stale worktree snapshot ===
Write-Host "`n[A2] Removing stale worktree snapshot..." -ForegroundColor Green
$worktree = Join-Path $root ".claude\worktrees\priceless-clarke"
if (Test-Path $worktree) {
    Remove-Item -Path $worktree -Recurse -Force
    Write-Host "  Removed: .claude\worktrees\priceless-clarke" -ForegroundColor Gray
}

# === A3: All node_modules ===
Write-Host "`n[A3] Removing all node_modules (will restore with pnpm install)..." -ForegroundColor Green
$nmDirs = Get-ChildItem -Path $root -Filter "node_modules" -Directory -Recurse -Force -ErrorAction SilentlyContinue
$nmCount = 0
foreach ($nm in $nmDirs) {
    Remove-Item -Path $nm.FullName -Recurse -Force -ErrorAction SilentlyContinue
    $nmCount++
}
Write-Host "  Removed $nmCount node_modules directories" -ForegroundColor Gray

# === A4: Build artifacts ===
Write-Host "`n[A4] Removing build artifacts (dist, .next, .wrangler, release, etc.)..." -ForegroundColor Green
$buildDirs = @("dist", ".next", ".wrangler", ".turbo", "release", "release_v2", "unified-dist", "playwright-report", "test-results", ".cache")
foreach ($pattern in $buildDirs) {
    $found = Get-ChildItem -Path $root -Filter $pattern -Directory -Recurse -Force -ErrorAction SilentlyContinue
    foreach ($f in $found) {
        Remove-Item -Path $f.FullName -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  Removed: $($f.FullName.Replace($root, '.'))" -ForegroundColor Gray
    }
}
# out_deploy* directories
Get-ChildItem -Path $root -Filter "out_deploy*" -Directory -Force -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item -Path $_.FullName -Recurse -Force
    Write-Host "  Removed: $($_.Name)" -ForegroundColor Gray
}

# === A5: Root orphan stub files ===
Write-Host "`n[A5] Removing root orphan stub files..." -ForegroundColor Green
$stubs = @(
    "expo", "next", "node", "npm", "nul", "claude-code",
    "opencode.json", "install-clickflash.sh", "d1_test.json",
    "mass_node_ingestion.sql"
)
foreach ($s in $stubs) {
    $path = Join-Path $root $s
    if (Test-Path $path -PathType Leaf) {
        Remove-Item -Path $path -Force
        Write-Host "  Removed: $s" -ForegroundColor Gray
    }
}
# Glob patterns for root scripts
$globPatterns = @(
    "apply_migration*.js", "check_schema*.ts", "clone_*.js", "clone_tools.py",
    "create_admin_user.js", "deploy-ecosystem.js", "dump_schema.js", "dump_settings.js",
    "find_missing_card.js", "fix_*.js", "index-*.js", "list_tables.js",
    "read_logs.js", "restore_script.js", "seed-test-management.sql",
    "setup_tools*.js", "setup_tools*.py", "verify_vector_index.ts", "apply_test_data.js",
    "mobile@*", "main-website@*"
)
foreach ($g in $globPatterns) {
    Get-ChildItem -Path $root -Filter $g -File -Force -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-Item -Path $_.FullName -Force
        Write-Host "  Removed: $($_.Name)" -ForegroundColor Gray
    }
}
# Root .txt debug logs
Get-ChildItem -Path $root -Filter "*.txt" -File -Force -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item -Path $_.FullName -Force
    Write-Host "  Removed: $($_.Name)" -ForegroundColor Gray
}

# === A6: Misc cached/temp files ===
Write-Host "`n[A6] Removing misc cached/temp files..." -ForegroundColor Green
$miscDirs = @("tmp", ".stratus", ".husky", "deployment")
foreach ($d in $miscDirs) {
    $path = Join-Path $root $d
    if (Test-Path $path) {
        Remove-Item -Path $path -Recurse -Force
        Write-Host "  Removed: $d" -ForegroundColor Gray
    }
}
# _tmp_* directories
Get-ChildItem -Path $root -Filter "_tmp_*" -Directory -Force -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item -Path $_.FullName -Recurse -Force
    Write-Host "  Removed: $($_.Name)" -ForegroundColor Gray
}
# Temp file extensions at root
$tempExts = @("*.log", "*.zip", "*.bak", "*.tmp", "*.patch")
foreach ($ext in $tempExts) {
    Get-ChildItem -Path $root -Filter $ext -File -Force -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-Item -Path $_.FullName -Force
        Write-Host "  Removed: $($_.Name)" -ForegroundColor Gray
    }
}
# apps/master/nul
$masterNul = Join-Path $root "apps\master\nul"
if (Test-Path $masterNul -PathType Leaf) {
    Remove-Item -Path $masterNul -Force
    Write-Host "  Removed: apps\master\nul" -ForegroundColor Gray
}

# --- After size ---
Write-Host "`n========================================" -ForegroundColor Cyan
$afterSize = (Get-ChildItem -Path $root -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
$saved = $beforeSize - $afterSize
Write-Host "After cleanup:  $([math]::Round($afterSize / 1GB, 2)) GB" -ForegroundColor Green
Write-Host "Space saved:    $([math]::Round($saved / 1GB, 2)) GB" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

# --- Git status check ---
Write-Host "`nVerifying git status is clean..." -ForegroundColor Yellow
$gitStatus = git -C $root status --short 2>&1
if ($gitStatus) {
    Write-Host "WARNING: Git status shows changes:" -ForegroundColor Red
    Write-Host $gitStatus
} else {
    Write-Host "Git status: CLEAN (all removed files were git-ignored)" -ForegroundColor Green
}

Write-Host "`nNext step: Run 'pnpm install' from repo root to restore node_modules." -ForegroundColor Yellow
Write-Host "Done!`n" -ForegroundColor Cyan
