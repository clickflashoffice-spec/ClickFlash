# ClickFlash Safe Cleanup Script (PowerShell)
# Removes build artifacts, caches, and stray lockfiles only.
# NEVER deletes application source code or functional assets.

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $PSScriptRoot
Set-Location $ROOT

Write-Host "ClickFlash Safe Cleanup — starting in $ROOT"

# Build caches
Write-Host "  -> Removing .turbo cache..."
Remove-Item -Recurse -Force .turbo/cache -ErrorAction SilentlyContinue

# App build outputs (not source)
Write-Host "  -> Removing app build outputs..."
Get-ChildItem -Path apps -Directory | ForEach-Object {
    $app = $_.FullName
    @("dist", ".next", "out", "release", "node_modules/.cache") | ForEach-Object {
        $target = Join-Path $app $_
        Remove-Item -Recurse -Force $target -ErrorAction SilentlyContinue
    }
}

# Root node cache
Remove-Item -Recurse -Force node_modules/.cache -ErrorAction SilentlyContinue

# Stray lockfiles
Write-Host "  -> Removing stray package-lock.json files..."
Get-ChildItem -Path packages -Recurse -Filter package-lock.json | Remove-Item -Force -ErrorAction SilentlyContinue

# Embedded node_modules in docs/archive
Write-Host "  -> Removing docs/archive node_modules..."
Get-ChildItem -Path docs/archive -Recurse -Directory -Filter node_modules -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item -Recurse -Force $_.FullName -ErrorAction SilentlyContinue
}

# TypeScript build info
Write-Host "  -> Removing tsconfig.tsbuildinfo files..."
Get-ChildItem -Path . -Recurse -Filter *.tsbuildinfo -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notlike "*\node_modules\*" } |
    Remove-Item -Force -ErrorAction SilentlyContinue

# Committed installer artifacts (should be CI-generated)
Write-Host "  -> Removing committed .exe installers..."
@("release", "RELEASES", "apps/installer/release", "apps/license-generator/release") | ForEach-Object {
    if (Test-Path $_) {
        Get-ChildItem -Path $_ -File | Where-Object {
            $_.Extension -in @(".exe", ".blockmap", ".yml", ".yaml")
        } | Remove-Item -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Safe cleanup complete."
